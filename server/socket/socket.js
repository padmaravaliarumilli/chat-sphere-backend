const { Server } = require('socket.io');

const Message = require('../models/Message');
const User = require('../models/User');

let io;

// Store active users
const onlineUsers = new Map();

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000',
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log('User Connected:', socket.id);

        // ==========================
        // USER ONLINE
        // ==========================

        socket.on('join', async (userId) => {
            onlineUsers.set(userId, socket.id);

            socket.userId = userId;

            // Update database status
            await User.findByIdAndUpdate(userId, {
                status: 'online',
                lastSeen: null,
            });

            // Notify other connected users

            socket.broadcast.emit('userOnline', {
                userId,
            });

            console.log('Sent online event for:', userId);

            console.log(`User ${userId} joined`);
        });

        // ==========================
        // DELIVERY RECEIPT
        // ==========================

        socket.on('messageDelivered', async (messageId) => {
            try {
                const message = await Message.findById(messageId);

                if (!message) {
                    return;
                }

                message.isDelivered = true;

                await message.save();

                const senderSocket = onlineUsers.get(message.sender.toString());

                if (senderSocket) {
                    io.to(senderSocket).emit('deliveryReceipt', {
                        messageId: message._id,
                        isDelivered: true,
                    });
                }
            } catch (error) {
                console.log('Delivery Receipt Error:', error.message);
            }
        });

        // ==========================
        // READ RECEIPT
        // ==========================

        socket.on('messageRead', async (data) => {
            try {
                const { messageId, readBy } = data;

                const message = await Message.findById(messageId);

                if (!message) {
                    return;
                }

                message.isRead = true;

                await message.save();

                const senderSocket = onlineUsers.get(message.sender.toString());

                if (senderSocket) {
                    io.to(senderSocket).emit('readReceipt', {
                        messageId: message._id,
                        isRead: true,
                        readBy,
                    });
                }
            } catch (error) {
                console.log('Read Receipt Error:', error.message);
            }
        });

        // ==========================
        // TYPING INDICATOR
        // ==========================

        socket.on('typing', (data) => {
            const { receiverId, senderId } = data;

            const receiverSocket = onlineUsers.get(receiverId);

            if (receiverSocket) {
                io.to(receiverSocket).emit('typing', {
                    senderId,
                });
            }
        });

        // ==========================
        // STOP TYPING
        // ==========================

        socket.on('stopTyping', (data) => {
            const { receiverId, senderId } = data;

            const receiverSocket = onlineUsers.get(receiverId);

            if (receiverSocket) {
                io.to(receiverSocket).emit('stopTyping', {
                    senderId,
                });
            }
        });

        // ==========================
        // USER OFFLINE
        // ==========================

        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);

                const lastSeen = new Date();

                await User.findByIdAndUpdate(socket.userId, {
                    status: 'offline',
                    lastSeen,
                });

                socket.broadcast.emit('userOffline', {
                    userId: socket.userId,
                    lastSeen,
                });
            }

            console.log('User Disconnected:', socket.id);
        });
    });
};

const getIO = () => io;

const getReceiverSocket = (userId) => {
    return onlineUsers.get(userId);
};

module.exports = {
    initializeSocket,

    getIO,

    getReceiverSocket,
};
