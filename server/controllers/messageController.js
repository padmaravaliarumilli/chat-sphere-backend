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

        const {
            receiverId,
            text,
            audio,
            messageType,
            expiresIn
        } = req.body || {};

        // Validation
        if (!receiverId) {
            return res.status(400).json({
                message: 'Receiver ID is required'
            });
        }

        // Self-destruct duration validation
        const allowedExpirationTimes = [
            30,        // 30 seconds
            60,        // 1 minute
            300,       // 5 minutes
            3600,      // 1 hour
            86400      // 24 hours
        ];

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
                    allowedValues: allowedExpirationTimes
                });
            }

            expiresAt = new Date(
                Date.now() + expirationSeconds * 1000
            );

            isSelfDestruct = true;
        }

        // Upload image if provided
        let imageUrl = '';

        if (req.file) {
            const result = await uploadToCloudinary(
                req.file.buffer,
                'chat-sphere/media',
                'image'
            );

            imageUrl = result.secure_url;
        }

        // Check message content
        if (!text && !imageUrl && !audio) {
            return res.status(400).json({
                message: 'Message cannot be empty'
            });
        }

        // Determine message type
        let finalMessageType = messageType || 'text';

        if (imageUrl) {
            finalMessageType = 'image';
        } else if (audio) {
            finalMessageType = 'audio';
        } else {
            finalMessageType = 'text';
        }

        // Find existing conversation
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: {
                $all: [senderId, receiverId]
            }
        });

        // Create conversation if not found
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                isGroup: false
            });
        }

        // Create message
        const message = await Message.create({
            conversation: conversation._id,
            sender: senderId,
            receiver: receiverId,
            text: text || '',
            image: imageUrl,
            audio: audio || '',
            messageType: finalMessageType,
            isRead: false,
            isDelivered: false,

            // Self-destruct fields
            expiresAt,
            isSelfDestruct
        });

        // Update conversation
        let lastMessage = text || '';

        if (imageUrl) {
            lastMessage = '📷 Image';
        } else if (audio) {
            lastMessage = '🎤 Voice message';
        }

        conversation.lastMessage = lastMessage;
        conversation.lastMessageSender = senderId;
        conversation.lastMessageTime = new Date();

        await conversation.save();

        // Send through Socket.IO
        const receiverSocket = getReceiverSocket(
            receiverId.toString()
        );

        if (receiverSocket) {
            getIO()
                .to(receiverSocket)
                .emit('newMessage', message);

            // Mark as delivered
            message.isDelivered = true;
            await message.save();
        }

        return res.status(201).json({
            message: 'Message sent successfully',
            data: message
        });

    } catch (error) {
        console.error('Send message error:', error);

        return res.status(500).json({
            message: error.message
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
                message: 'Conversation not found'
            });
        }

        // Check participant
        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to view this conversation'
            });
        }

        const messages = await Message.find({
            conversation: conversationId
        })
            .populate('sender', 'name profilePic')
            .populate('receiver', 'name profilePic')
            .sort({ createdAt: 1 });

        return res.status(200).json({
            message: 'Messages fetched successfully',
            data: messages
        });

    } catch (error) {
        console.error('Get messages error:', error);

        return res.status(500).json({
            message: error.message
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
                message: 'Conversation not found'
            });
        }

        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to access this conversation'
            });
        }

        // Get unread messages
        const unreadMessages = await Message.find({
            conversation: conversationId,
            receiver: userId,
            isRead: false
        });

        // Mark as read
        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        const io = getIO();

        // Send read receipt
        unreadMessages.forEach((message) => {
            const senderSocket = getReceiverSocket(
                message.sender.toString()
            );

            if (senderSocket) {
                io.to(senderSocket).emit('readReceipt', {
                    conversationId,
                    messageId: message._id,
                    readBy: userId,
                    isRead: true
                });
            }
        });

        return res.status(200).json({
            message: 'Messages marked as read successfully'
        });

    } catch (error) {
        console.error('Mark messages as read error:', error);

        return res.status(500).json({
            message: error.message
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
            isRead: false
        });

        return res.status(200).json({
            message: 'Unread message count fetched successfully',
            unreadCount
        });

    } catch (error) {
        console.error('Unread message count error:', error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// =====================================================
// Edit Message
// =====================================================
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

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        // Check ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You can delete only your own messages'
            });
        }

        await Message.findByIdAndDelete(messageId);

        // Notify receiver
        const receiverSocket = getReceiverSocket(
            message.receiver.toString()
        );

        if (receiverSocket) {
            getIO()
                .to(receiverSocket)
                .emit('messageDeleted', {
                    messageId: message._id,
                    conversationId: message.conversation
                });
        }

        return res.status(200).json({
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Delete message error:', error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// =====================================================
// Schedule Message
// =====================================================
const scheduleMessage = async (req, res) => {
    try {
        const {
            conversationId,
            receiverId,
            text,
            scheduledAt,
            messageType
        } = req.body;

        const senderId = req.user._id;

        // Validate required fields
        if (!conversationId || !receiverId || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'conversationId, receiverId and scheduledAt are required'
            });
        }

        // Validate text
        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message text is required'
            });
        }

        // Validate scheduled date
        const scheduleTime = new Date(scheduledAt);

        if (isNaN(scheduleTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduledAt date'
            });
        }

        if (scheduleTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled time must be in the future'
            });
        }

        // Find conversation
        const conversation = await Conversation.findById(
            conversationId
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Check sender is participant
        const isParticipant = conversation.participants.some(
            participant =>
                participant.toString() === senderId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation'
            });
        }

        // Check receiver is participant
        const isReceiverParticipant = conversation.participants.some(
            participant =>
                participant.toString() === receiverId.toString()
        );

        if (!isReceiverParticipant) {
            return res.status(400).json({
                success: false,
                message: 'Receiver is not a participant in this conversation'
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
            isDelivered: false
        });

        return res.status(201).json({
            success: true,
            message: 'Message scheduled successfully',
            data: {
                scheduledMessage: message
            }
        });

    } catch (error) {
        console.error('Schedule message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to schedule message',
            error: error.message
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
            scheduledStatus: 'pending'
        })
            .populate('receiver', 'name profilePic')
            .populate('conversation')
            .sort({ scheduledAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Scheduled messages fetched successfully',
            data: scheduledMessages
        });

    } catch (error) {
        console.error('Get scheduled messages error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch scheduled messages',
            error: error.message
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
                message: 'Scheduled message not found'
            });
        }

        // Check ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can cancel only your own scheduled messages'
            });
        }

        // Check scheduled message
        if (!message.isScheduled) {
            return res.status(400).json({
                success: false,
                message: 'This is not a scheduled message'
            });
        }

        // Only pending messages can be cancelled
        if (message.scheduledStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a message with status: ${message.scheduledStatus}`
            });
        }

        // Cancel message
        message.scheduledStatus = 'cancelled';

        await message.save();

        return res.status(200).json({
            success: true,
            message: 'Scheduled message cancelled successfully',
            data: {
                scheduledMessage: message
            }
        });

    } catch (error) {
        console.error('Cancel scheduled message error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to cancel scheduled message',
            error: error.message
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

    scheduleMessage,
    getScheduledMessages,
    cancelScheduledMessage,
    rescheduleMessage,
};