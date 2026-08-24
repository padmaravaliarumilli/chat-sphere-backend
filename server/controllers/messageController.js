const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getIO, getReceiverSocket } = require('../socket/socket');
const uploadToCloudinary = require('../utils/cloudinaryUpload');

// Send Message
const sendMessage = async (req, res) => {
    try {

        const senderId = req.user._id;

        const {
            receiverId,
            text,
            audio,
            messageType
        } = req.body || {};

        // Validation
        if (!receiverId) {
            return res.status(400).json({
                message: 'Receiver ID is required'
            });
        }

        // Check whether image file was uploaded
        let imageUrl = '';

        if (req.file) {

            const result = await uploadToCloudinary(
                req.file.buffer,
                'chat-sphere/media',
                'image'
            );

            imageUrl = result.secure_url;
        }

        // Check whether message has content
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

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: {
                $all: [senderId, receiverId]
            }
        });

        // Create conversation if it does not exist
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

            isDelivered: false
        });

        // Update conversation last message
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

        // Send message in real time
        const receiverSocket = getReceiverSocket(
            receiverId.toString()
        );

        if (receiverSocket) {

            getIO()
                .to(receiverSocket)
                .emit('newMessage', message);
        }

        res.status(201).json({

            message: 'Message sent successfully',

            data: message
        });

    } catch (error) {

        console.error('Send message error:', error);

        res.status(500).json({
            message: error.message
        });
    }
};


// Get Messages
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const userId = req.user._id;

        // Find conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found',
            });
        }

        // Check if logged-in user belongs to conversation

        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to view this conversation',
            });
        }

        // Fetch messages

        const messages = await Message.find({
            conversation: conversationId,
        })
            .populate('sender', 'name profilePic')
            .populate('receiver', 'name profilePic')
            .sort({ createdAt: 1 });

        res.status(200).json({
            message: 'Messages fetched successfully',
            data: messages,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Mark Messages as Read
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

        const isParticipant = conversation.participants.some(
            (id) => id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not allowed to access this conversation',
            });
        }

        // Get unread messages before updating
        const unreadMessages = await Message.find({
            conversation: conversationId,
            receiver: userId,
            isRead: false,
        });

        // Mark messages as read
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

        // Send read receipt to senders
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

        res.status(200).json({
            message: 'Messages marked as read successfully',
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Get unread message count
const getUnreadMessageCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            isRead: false,
        });

        res.status(200).json({
            message: 'Unread message count fetched successfully',
            unreadCount,
        });
    } catch (error) {
        res.status(500).json({
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
        if (!text) {
            return res.status(400).json({
                message: 'Message text is required',
            });
        }

        // Find message
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'Message not found',
            });
        }

        // Check sender ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You can edit only your own messages',
            });
        }

        // Check if message is already read
        if (message.isRead) {
            return res.status(400).json({
                message: 'You cannot edit a message after it is read',
            });
        }

        // Update message
        message.text = text;

        await message.save();

        res.status(200).json({
            message: 'Message updated successfully',
            data: message,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
// Delete Message
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

        // Check sender ownership
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'You can delete only your own messages',
            });
        }

        // Delete message
        await Message.findByIdAndDelete(messageId);

        // Notify receiver in real-time
        const receiverSocket = getReceiverSocket(message.receiver.toString());

        if (receiverSocket) {
            getIO().to(receiverSocket).emit('messageDeleted', {
                messageId: message._id,
                conversationId: message.conversation,
            });
        }
        res.status(200).json({
            message: 'Message deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    getUnreadMessageCount,
    editMessage,
    deleteMessage,
};
