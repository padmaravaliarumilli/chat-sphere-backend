const { Server } = require('socket.io');

const Message = require('../models/Message');
const User = require('../models/User');

let io;

// Store active users
// userId -> socketId
const onlineUsers = new Map();


// =====================================================
// INITIALIZE SOCKET.IO
// =====================================================

const initializeSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000',
            credentials: true,
        },
    });


    // =====================================================
    // SELF-DESTRUCT MESSAGE WATCHER
    // =====================================================

    const messageChangeStream = Message.watch([], {
        fullDocumentBeforeChange: 'whenAvailable',
    });


    messageChangeStream.on('change', (change) => {

        try {

            // We only care about deleted messages
            if (change.operationType !== 'delete') {
                return;
            }


            // Get the deleted document
            const deletedMessage =
                change.fullDocumentBeforeChange;


            // Previous document unavailable
            if (!deletedMessage) {

                console.log(
                    'Deleted message data unavailable:',
                    change.documentKey._id
                );

                return;
            }


            // Only process self-destruct messages
            if (!deletedMessage.isSelfDestruct) {
                return;
            }


            const messageId =
                deletedMessage._id;


            const receiverId =
                deletedMessage.receiver?.toString();


            // Receiver is missing
            if (!receiverId) {

                console.log(
                    'Self-destruct message has no receiver:',
                    messageId
                );

                return;
            }


            // Find receiver socket
            const receiverSocket =
                onlineUsers.get(receiverId);


            // =================================================
            // RECEIVER ONLINE
            // =================================================

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    'messageExpired',
                    {
                        messageId:
                            messageId.toString(),

                        conversationId:
                            deletedMessage.conversation?.toString(),
                    }
                );


                console.log(
                    `Self-destruct message ${messageId} expired for user ${receiverId}`
                );

            }

            // =================================================
            // RECEIVER OFFLINE
            // =================================================

            else {

                console.log(
                    `Receiver ${receiverId} is offline. ` +
                    `Message ${messageId} expired.`
                );
            }


        } catch (error) {

            console.error(
                'Self-destruct watcher error:',
                error.message
            );
        }
    });


    // =====================================================
    // CHANGE STREAM ERROR
    // =====================================================

    messageChangeStream.on('error', (error) => {

        console.error(
            'Self-destruct change stream error:',
            error.message
        );
    });


    // =====================================================
    // SOCKET CONNECTION
    // =====================================================

    io.on('connection', (socket) => {

        console.log(
            'User Connected:',
            socket.id
        );


        // =================================================
        // USER JOIN
        // =================================================

        socket.on('join', async (userId) => {

            try {

                // Always convert to string
                const userIdString =
                    userId.toString();


                // Store active user
                onlineUsers.set(
                    userIdString,
                    socket.id
                );


                // Store user ID on socket
                socket.userId =
                    userIdString;


                // Update user status
                await User.findByIdAndUpdate(
                    userIdString,
                    {
                        status: 'online',
                        lastSeen: null,
                    }
                );


                console.log(
                    `User ${userIdString} joined`
                );


                // Notify other users
                socket.broadcast.emit(
                    'userOnline',
                    {
                        userId:
                            userIdString,
                    }
                );


                // =================================================
                // DELIVER UNDELIVERED SCHEDULED MESSAGES
                // =================================================

                const undeliveredMessages =
                    await Message.find({
                        receiver: userIdString,
                        isScheduled: true,
                        scheduledStatus: 'sent',
                        isDelivered: false,
                    }).sort({
                        scheduledAt: 1,
                    });


                if (
                    undeliveredMessages.length > 0
                ) {

                    console.log(
                        `Found ${undeliveredMessages.length} ` +
                        `undelivered scheduled message(s) ` +
                        `for user ${userIdString}`
                    );


                    for (
                        const message
                        of undeliveredMessages
                    ) {

                        // Send message
                        io.to(socket.id).emit(
                            'newMessage',
                            message
                        );


                        // Mark delivered
                        message.isDelivered = true;

                        await message.save();


                        // Find sender socket
                        const senderSocket =
                            onlineUsers.get(
                                message.sender.toString()
                            );


                        if (senderSocket) {

                            io.to(senderSocket).emit(
                                'deliveryReceipt',
                                {
                                    messageId:
                                        message._id,

                                    isDelivered:
                                        true,
                                }
                            );
                        }


                        console.log(
                            `Scheduled message ${message._id} ` +
                            `delivered to ${userIdString}`
                        );
                    }
                }


            } catch (error) {

                console.error(
                    'Join/online user error:',
                    error.message
                );
            }
        });


        // =================================================
        // DELIVERY RECEIPT
        // =================================================

        socket.on(
            'messageDelivered',
            async (messageId) => {

                try {

                    const message =
                        await Message.findById(
                            messageId
                        );


                    if (!message) {
                        return;
                    }


                    message.isDelivered =
                        true;

                    await message.save();


                    const senderSocket =
                        onlineUsers.get(
                            message.sender.toString()
                        );


                    if (senderSocket) {

                        io.to(senderSocket).emit(
                            'deliveryReceipt',
                            {
                                messageId:
                                    message._id,

                                isDelivered:
                                    true,
                            }
                        );
                    }


                } catch (error) {

                    console.log(
                        'Delivery Receipt Error:',
                        error.message
                    );
                }
            }
        );


        // =================================================
        // READ RECEIPT
        // =================================================

        socket.on(
            'messageRead',
            async (data) => {

                try {

                    const {
                        messageId,
                        readBy,
                    } = data;


                    const message =
                        await Message.findById(
                            messageId
                        );


                    if (!message) {
                        return;
                    }


                    message.isRead = true;

                    await message.save();


                    const senderSocket =
                        onlineUsers.get(
                            message.sender.toString()
                        );


                    if (senderSocket) {

                        io.to(senderSocket).emit(
                            'readReceipt',
                            {
                                messageId:
                                    message._id,

                                isRead: true,

                                readBy,
                            }
                        );
                    }


                } catch (error) {

                    console.log(
                        'Read Receipt Error:',
                        error.message
                    );
                }
            }
        );


        // =================================================
        // TYPING
        // =================================================

        socket.on(
            'typing',
            (data) => {

                const {
                    receiverId,
                    senderId,
                } = data;


                const receiverSocket =
                    onlineUsers.get(
                        receiverId.toString()
                    );


                if (receiverSocket) {

                    io.to(receiverSocket).emit(
                        'typing',
                        {
                            senderId,
                        }
                    );
                }
            }
        );


        // =================================================
        // STOP TYPING
        // =================================================

        socket.on(
            'stopTyping',
            (data) => {

                const {
                    receiverId,
                    senderId,
                } = data;


                const receiverSocket =
                    onlineUsers.get(
                        receiverId.toString()
                    );


                if (receiverSocket) {

                    io.to(receiverSocket).emit(
                        'stopTyping',
                        {
                            senderId,
                        }
                    );
                }
            }
        );


        // =================================================
        // DISCONNECT
        // =================================================

        socket.on(
            'disconnect',
            async () => {

                try {

                    if (socket.userId) {

                        const currentSocket =
                            onlineUsers.get(
                                socket.userId
                            );


                        // Only remove the active socket
                        if (
                            currentSocket ===
                            socket.id
                        ) {

                            onlineUsers.delete(
                                socket.userId
                            );


                            const lastSeen =
                                new Date();


                            await User.findByIdAndUpdate(
                                socket.userId,
                                {
                                    status: 'offline',
                                    lastSeen,
                                }
                            );


                            socket.broadcast.emit(
                                'userOffline',
                                {
                                    userId:
                                        socket.userId,

                                    lastSeen,
                                }
                            );
                        }
                    }


                    console.log(
                        'User Disconnected:',
                        socket.id
                    );


                } catch (error) {

                    console.error(
                        'Disconnect error:',
                        error.message
                    );
                }
            }
        );
    });
};


// =====================================================
// GET SOCKET.IO INSTANCE
// =====================================================

const getIO = () => {
    return io;
};


// =====================================================
// GET RECEIVER SOCKET
// =====================================================

const getReceiverSocket = (userId) => {

    if (!userId) {
        return null;
    }

    return onlineUsers.get(
        userId.toString()
    );
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    initializeSocket,
    getIO,
    getReceiverSocket,
};