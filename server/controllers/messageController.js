const fs = require('fs');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getIO, getReceiverSocket } = require('../socket/socket');
const uploadToCloudinary = require('../utils/cloudinaryUpload');

// =====================================================
// Send Message
// =====================================================

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user._id;

        const { conversationId, receiverId, text, audio, messageType, expiresIn } = req.body || {};

        // =====================================================
        // Self-destruct duration validation
        // =====================================================

        const allowedExpirationTimes = [30, 60, 300, 3600, 86400];

        let expiresAt = null;
        let isSelfDestruct = false;

        if (expiresIn !== undefined && expiresIn !== null) {
            const expirationSeconds = Number(expiresIn);

            if (
                !Number.isInteger(expirationSeconds) ||
                !allowedExpirationTimes.includes(expirationSeconds)
            ) {
                return res.status(400).json({
                    message: 'Invalid expiration time',
                    allowedValues: allowedExpirationTimes,
                });
            }

            expiresAt = new Date(Date.now() + expirationSeconds * 1000);

            isSelfDestruct = true;
        }

        // =====================================================
        // MEDIA VARIABLES
        // =====================================================

        let imageUrl = '';
        let audioUrl = '';
        let fileUrl = '';
        let fileName = '';
        let fileSize = 0;
        let mimeType = '';

        // =====================================================
        // UPLOAD FILE
        // =====================================================

        if (req.file) {
            mimeType = req.file.mimetype;
            fileName = req.file.originalname;
            fileSize = req.file.size;

            let resourceType = 'raw';

            // =====================================================
            // DETERMINE CLOUDINARY RESOURCE TYPE
            // =====================================================

            if (mimeType.startsWith('image/')) {
                resourceType = 'image';
            } else if (mimeType.startsWith('video/')) {
                resourceType = 'video';
            } else if (mimeType.startsWith('audio/')) {
                // Cloudinary stores audio using video resource type
                resourceType = 'video';
            } else {
                resourceType = 'raw';
            }

            try {
                // =====================================================
                // UPLOAD TEMP FILE TO CLOUDINARY
                // =====================================================

                const result = await uploadToCloudinary(
                    req.file.path,
                    'chat-sphere/media',
                    resourceType
                );

                fileUrl = result.secure_url;

                // =====================================================
                // STORE URL ACCORDING TO FILE TYPE
                // =====================================================

                if (mimeType.startsWith('image/')) {
                    imageUrl = fileUrl;
                }

                if (mimeType.startsWith('audio/')) {
                    audioUrl = fileUrl;
                }
            } finally {
                // =====================================================
                // DELETE TEMPORARY FILE
                // =====================================================

                if (req.file.path && fs.existsSync(req.file.path)) {
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (deleteError) {
                        console.error('Failed to delete temporary file:', deleteError.message);
                    }
                }
            }
        }

        // =====================================================
        // BACKWARD COMPATIBILITY
        // =====================================================

        // If audio URL was directly supplied in request body,
        // keep supporting it.
        if (!audioUrl && audio) {
            audioUrl = audio;
        }

        // =====================================================
        // CHECK MESSAGE CONTENT
        // =====================================================

        if (!text?.trim() && !imageUrl && !audioUrl && !fileUrl) {
            return res.status(400).json({
                message: 'Message cannot be empty',
            });
        }

        // =====================================================
        // DETERMINE MESSAGE TYPE
        // =====================================================

        let finalMessageType = messageType || 'text';

        if (req.file) {
            if (mimeType.startsWith('image/')) {
                finalMessageType = 'image';
            } else if (mimeType.startsWith('video/')) {
                finalMessageType = 'video';
            } else if (mimeType.startsWith('audio/')) {
                finalMessageType = 'audio';
            } else {
                finalMessageType = 'document';
            }
        } else if (audioUrl) {
            finalMessageType = 'audio';
        } else if (imageUrl) {
            finalMessageType = 'image';
        } else {
            finalMessageType = 'text';
        }

        // =====================================================
        // CONVERSATION HANDLING
        // =====================================================

        let conversation;
        let isGroupMessage = false;

        // =====================================================
        // GROUP MESSAGE
        // =====================================================

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);

            if (!conversation) {
                return res.status(404).json({
                    message: 'Conversation not found',
                });
            }

            const isParticipant = conversation.participants.some(
                (participant) => participant.toString() === senderId.toString()
            );

            if (!isParticipant) {
                return res.status(403).json({
                    message: 'You are not a participant in this conversation',
                });
            }

            if (!conversation.isGroup) {
                return res.status(400).json({
                    message: 'conversationId belongs to a direct conversation',
                });
            }

            isGroupMessage = true;
        }

        // =====================================================
        // DIRECT MESSAGE
        // =====================================================
        else {
            if (!receiverId) {
                return res.status(400).json({
                    message: 'receiverId is required for direct messages',
                });
            }

            conversation = await Conversation.findOne({
                isGroup: false,
                participants: {
                    $all: [senderId, receiverId],
                },
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [senderId, receiverId],
                    isGroup: false,
                });
            }
        }

        // =====================================================
        // CREATE MESSAGE
        // =====================================================

        const message = await Message.create({
            conversation: conversation._id,
            sender: senderId,

            receiver: isGroupMessage ? null : receiverId,

            text: text?.trim() || '',

            image: imageUrl,

            audio: audioUrl,

            fileUrl: fileUrl,
            fileName: fileName,
            fileSize: fileSize,
            mimeType: mimeType,

            messageType: finalMessageType,

            isRead: false,
            isDelivered: false,

            deliveryStatus: [],
            readStatus: [],

            expiresAt,
            isSelfDestruct,
        });

        // =====================================================
        // ADD FILE METADATA
        // =====================================================

        // Your current Message model does not have file metadata
        // fields, so do not try to save them yet.
        //
        // We will add these fields in Message model next:
        //
        // fileUrl
        // fileName
        // fileSize
        // mimeType

        // =====================================================
        // UPDATE CONVERSATION
        // =====================================================

        let lastMessage = text?.trim() || '';

        if (finalMessageType === 'image') {
            lastMessage = '📷 Image';
        } else if (finalMessageType === 'video') {
            lastMessage = '🎥 Video';
        } else if (finalMessageType === 'audio') {
            lastMessage = '🎤 Voice message';
        } else if (finalMessageType === 'document') {
            lastMessage = `📎 ${fileName || 'Document'}`;
        }

        conversation.lastMessage = lastMessage;
        conversation.lastMessageSender = senderId;
        conversation.lastMessageTime = new Date();

        await conversation.save();

        // =====================================================
        // SOCKET.IO
        // =====================================================

        const io = getIO();

        // =====================================================
        // GROUP MESSAGE SOCKET
        // =====================================================

        if (isGroupMessage) {
            for (const participantId of conversation.participants) {
                const participantIdString = participantId.toString();

                if (participantIdString === senderId.toString()) {
                    continue;
                }

                const participantSocket = getReceiverSocket(participantIdString);

                if (participantSocket) {
                    io.to(participantSocket).emit('newMessage', message);

                    console.log(
                        `Group message ${message._id} sent to participant ${participantIdString}`
                    );
                } else {
                    console.log(
                        `Participant ${participantIdString} is offline for group message ${message._id}`
                    );
                }
            }
        }

        // =====================================================
        // DIRECT MESSAGE SOCKET
        // =====================================================
        else {
            const receiverSocket = getReceiverSocket(receiverId.toString());

            if (receiverSocket) {
                io.to(receiverSocket).emit('newMessage', message);

                message.isDelivered = true;

                await message.save();
            }
        }

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(201).json({
            message: 'Message sent successfully',
            data: message,
        });
    } catch (error) {
        console.error('Send message error:', error);

        return res.status(500).json({
            message: error.message,
        });
    }
};

// =====================================================
// Get Messages
// =====================================================
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found',
            });
        }

        // Check participant
        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to view this conversation',
            });
        }

        const messages = await Message.find({
            conversation: conversationId,
        })
            .populate('sender', 'name profilePic')
            .populate('receiver', 'name profilePic')
            .sort({ createdAt: 1 });

        return res.status(200).json({
            message: 'Messages fetched successfully',
            data: messages,
        });
    } catch (error) {
        console.error('Get messages error:', error);

        return res.status(500).json({
            message: error.message,
        });
    }
};

// =====================================================
// Mark Messages as Read
// =====================================================

const markMessagesAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found',
            });
        }

        // =====================================================
        // CHECK PARTICIPANT
        // =====================================================

        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to access this conversation',
            });
        }

        // =====================================================
        // GROUP MESSAGE
        // =====================================================

        if (conversation.isGroup) {
            const messages = await Message.find({
                conversation: conversationId,
                sender: {
                    $ne: userId,
                },
            });

            const unreadMessages = [];

            for (const message of messages) {
                const alreadyRead = message.readStatus.some(
                    (status) => status.user.toString() === userId.toString()
                );

                if (!alreadyRead) {
                    message.readStatus.push({
                        user: userId,
                        readAt: new Date(),
                    });

                    await message.save();

                    await updateGroupReadStatusForController(message);

                    unreadMessages.push(message);
                }
            }

            // =================================================
            // SEND READ RECEIPTS TO SENDERS
            // =================================================

            const io = getIO();

            unreadMessages.forEach((message) => {
                const senderSocket = getReceiverSocket(message.sender.toString());

                if (senderSocket) {
                    io.to(senderSocket).emit('readReceipt', {
                        conversationId,
                        messageId: message._id,

                        readBy: userId,

                        isRead: true,
                    });
                }
            });

            return res.status(200).json({
                message: 'Group messages marked as read successfully',
            });
        }

        // =====================================================
        // DIRECT MESSAGE
        // =====================================================

        const unreadMessages = await Message.find({
            conversation: conversationId,
            receiver: userId,
            isRead: false,
        });

        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                isRead: false,
            },
            {
                $set: {
                    isRead: true,
                },
            }
        );

        const io = getIO();

        unreadMessages.forEach((message) => {
            const senderSocket = getReceiverSocket(message.sender.toString());

            if (senderSocket) {
                io.to(senderSocket).emit('readReceipt', {
                    conversationId,
                    messageId: message._id,

                    readBy: userId,

                    isRead: true,
                });
            }
        });

        return res.status(200).json({
            message: 'Messages marked as read successfully',
        });
    } catch (error) {
        console.error('Mark messages as read error:', error);

        return res.status(500).json({
            message: error.message,
        });
    }
};

// =====================================================
// Get Unread Message Count
// =====================================================
const getUnreadMessageCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            isRead: false,
        });

        return res.status(200).json({
            message: 'Unread message count fetched successfully',
            unreadCount,
        });
    } catch (error) {
        console.error('Unread message count error:', error);

        return res.status(500).json({
            message: error.message,
        });
    }
};

// Edit Message
const editMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        const { text } = req.body;

        // Validate text
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message text is required',
            });
        }

        // Find message
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found',
            });
        }

        // Check sender ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can edit only your own messages',
            });
        }

        // ==========================================
        // SCHEDULED MESSAGE VALIDATION
        // ==========================================

        if (message.isScheduled) {
            // Only pending scheduled messages can be edited
            if (message.scheduledStatus !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot edit scheduled message with status: ${message.scheduledStatus}`,
                });
            }

            // Make sure scheduled time has not passed
            if (message.scheduledAt && message.scheduledAt <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot edit a scheduled message after its scheduled time',
                });
            }
        }

        // ==========================================
        // NORMAL MESSAGE VALIDATION
        // ==========================================

        if (!message.isScheduled && message.isRead) {
            return res.status(400).json({
                success: false,
                message: 'You cannot edit a message after it is read',
            });
        }

        // ==========================================
        // UPDATE MESSAGE
        // ==========================================

        message.text = text.trim();

        await message.save();

        return res.status(200).json({
            success: true,
            message: message.isScheduled
                ? 'Scheduled message updated successfully'
                : 'Message updated successfully',
            data: {
                message,
            },
        });
    } catch (error) {
        console.error('Edit message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to edit message',
            error: error.message,
        });
    }
};

// =====================================================
// Delete Message
// =====================================================
const deleteMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;

        // Find message
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'Message not found',
            });
        }

        // =====================================================
        // CHECK MESSAGE OWNER
        // =====================================================

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You can delete only your own messages',
            });
        }

        // =====================================================
        // FIND CONVERSATION
        // =====================================================

        const conversation = await Conversation.findById(message.conversation);

        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found',
            });
        }

        // =====================================================
        // CHECK USER IS PARTICIPANT
        // =====================================================

        const isParticipant = conversation.participants.some(
            (participant) => participant.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation',
            });
        }

        // =====================================================
        // DELETE MESSAGE
        // =====================================================

        await Message.findByIdAndDelete(messageId);

        const io = getIO();

        // =====================================================
        // GROUP MESSAGE
        // =====================================================

        if (conversation.isGroup) {
            for (const participantId of conversation.participants) {
                const participantIdString = participantId.toString();

                // Don't send deletion event back to sender
                if (participantIdString === userId.toString()) {
                    continue;
                }

                const participantSocket = getReceiverSocket(participantIdString);

                if (participantSocket) {
                    io.to(participantSocket).emit('messageDeleted', {
                        messageId: message._id,
                        conversationId: message.conversation,
                        deletedBy: userId,
                    });

                    console.log(
                        `Group message ${messageId} deletion sent to ${participantIdString}`
                    );
                }
            }
        }

        // =====================================================
        // DIRECT MESSAGE
        // =====================================================
        else {
            // Direct messages should always have a receiver
            if (message.receiver) {
                const receiverSocket = getReceiverSocket(message.receiver.toString());

                if (receiverSocket) {
                    io.to(receiverSocket).emit('messageDeleted', {
                        messageId: message._id,
                        conversationId: message.conversation,
                        deletedBy: userId,
                    });
                }
            }
        }

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({
            message: 'Message deleted successfully',
        });
    } catch (error) {
        console.error('Delete message error:', error);

        return res.status(500).json({
            message: error.message,
        });
    }
};

// =====================================================
// Schedule Message
// =====================================================
const scheduleMessage = async (req, res) => {
    try {
        const { conversationId, receiverId, text, scheduledAt, messageType } = req.body;

        const senderId = req.user._id;

        // Validate required fields
        if (!conversationId || !receiverId || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'conversationId, receiverId and scheduledAt are required',
            });
        }

        // Validate text
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message text is required',
            });
        }

        // Validate scheduled date
        const scheduleTime = new Date(scheduledAt);

        if (isNaN(scheduleTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduledAt date',
            });
        }

        if (scheduleTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled time must be in the future',
            });
        }

        // Find conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // Check sender is participant
        const isParticipant = conversation.participants.some(
            (participant) => participant.toString() === senderId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
        }

        // Check receiver is participant
        const isReceiverParticipant = conversation.participants.some(
            (participant) => participant.toString() === receiverId.toString()
        );

        if (!isReceiverParticipant) {
            return res.status(400).json({
                success: false,
                message: 'Receiver is not a participant in this conversation',
            });
        }

        // Create scheduled message
        const message = await Message.create({
            conversation: conversationId,
            sender: senderId,
            receiver: receiverId,
            text: text.trim(),
            messageType: messageType || 'text',
            isScheduled: true,
            scheduledAt: scheduleTime,
            scheduledStatus: 'pending',
            isRead: false,
            isDelivered: false,
        });

        return res.status(201).json({
            success: true,
            message: 'Message scheduled successfully',
            data: {
                scheduledMessage: message,
            },
        });
    } catch (error) {
        console.error('Schedule message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to schedule message',
            error: error.message,
        });
    }
};

// =====================================================
// Get Scheduled Messages
// =====================================================
const getScheduledMessages = async (req, res) => {
    try {
        const userId = req.user._id;

        const scheduledMessages = await Message.find({
            sender: userId,
            isScheduled: true,
            scheduledStatus: 'pending',
        })
            .populate('receiver', 'name profilePic')
            .populate('conversation')
            .sort({ scheduledAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Scheduled messages fetched successfully',
            data: scheduledMessages,
        });
    } catch (error) {
        console.error('Get scheduled messages error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch scheduled messages',
            error: error.message,
        });
    }
};

// =====================================================
// Cancel Scheduled Message
// =====================================================
const cancelScheduledMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled message not found',
            });
        }

        // Check ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can cancel only your own scheduled messages',
            });
        }

        // Check scheduled message
        if (!message.isScheduled) {
            return res.status(400).json({
                success: false,
                message: 'This is not a scheduled message',
            });
        }

        // Only pending messages can be cancelled
        if (message.scheduledStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a message with status: ${message.scheduledStatus}`,
            });
        }

        // Cancel message
        message.scheduledStatus = 'cancelled';

        await message.save();

        return res.status(200).json({
            success: true,
            message: 'Scheduled message cancelled successfully',
            data: {
                scheduledMessage: message,
            },
        });
    } catch (error) {
        console.error('Cancel scheduled message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to cancel scheduled message',
            error: error.message,
        });
    }
};

// Reschedule Scheduled Message
const rescheduleMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        const { scheduledAt } = req.body;

        // Validate scheduledAt
        if (!scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'scheduledAt is required',
            });
        }

        // Convert scheduled time
        const scheduleTime = new Date(scheduledAt);

        if (isNaN(scheduleTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduledAt date',
            });
        }

        // Scheduled time must be in the future
        if (scheduleTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled time must be in the future',
            });
        }

        // Find message
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled message not found',
            });
        }

        // Check sender ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can reschedule only your own messages',
            });
        }

        // Check scheduled message
        if (!message.isScheduled) {
            return res.status(400).json({
                success: false,
                message: 'This is not a scheduled message',
            });
        }

        // Only pending messages can be rescheduled
        if (message.scheduledStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reschedule a message with status: ${message.scheduledStatus}`,
            });
        }

        // Update scheduled time
        message.scheduledAt = scheduleTime;

        await message.save();

        return res.status(200).json({
            success: true,
            message: 'Scheduled message rescheduled successfully',
            data: {
                scheduledMessage: message,
            },
        });
    } catch (error) {
        console.error('Reschedule message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to reschedule message',
            error: error.message,
        });
    }
};

const enableSelfDestruct = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        const { expiresIn } = req.body || {};

        const allowedExpirationTimes = [30, 60, 300, 3600, 86400];

        if (expiresIn === undefined || expiresIn === null) {
            return res.status(400).json({
                success: false,
                message: 'expiresIn is required',
                allowedValues: allowedExpirationTimes,
            });
        }

        const expirationSeconds = Number(expiresIn);

        if (
            !Number.isInteger(expirationSeconds) ||
            !allowedExpirationTimes.includes(expirationSeconds)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid expiration time',
                allowedValues: allowedExpirationTimes,
            });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found',
            });
        }

        const conversation = await Conversation.findById(message.conversation);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        const isParticipant = conversation.participants.some(
            (participant) => participant.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can enable self-destruct only for your own messages',
            });
        }

        if (message.isSelfDestruct) {
            return res.status(400).json({
                success: false,
                message: 'Self-destruct is already enabled for this message',
                expiresAt: message.expiresAt,
            });
        }

        message.expiresAt = new Date(Date.now() + expirationSeconds * 1000);

        message.isSelfDestruct = true;

        await message.save();

        return res.status(200).json({
            success: true,
            message: 'Self-destruct enabled successfully',
            data: {
                messageId: message._id,
                expiresIn: expirationSeconds,
                expiresAt: message.expiresAt,
                isSelfDestruct: message.isSelfDestruct,
            },
        });
    } catch (error) {
        console.error('Enable self-destruct error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to enable self-destruct',
            error: error.message,
        });
    }
};

// =====================================================
// Exports
// =====================================================
module.exports = {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    getUnreadMessageCount,
    editMessage,
    deleteMessage,
    enableSelfDestruct,
    scheduleMessage,
    getScheduledMessages,
    cancelScheduledMessage,
    rescheduleMessage,
};
