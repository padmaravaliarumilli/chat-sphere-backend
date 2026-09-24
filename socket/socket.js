const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

let io;

// Store active users
// userId -> socketId
const onlineUsers = new Map();

// =====================================================
// HELPER - GET GROUP USER NAME
// =====================================================

const reqUserName = (conversation, userId) => {
    const participant = conversation.participants.find(
        (user) =>
            user._id.toString() === userId.toString()
    );

    return participant ? participant.name : 'Someone';
};

// =====================================================
// UPDATE GROUP DELIVERY STATUS
// =====================================================

const updateGroupDeliveryStatus = async (messageId) => {
    try {
        // Always get the latest version from MongoDB
        const message = await Message.findById(messageId);

        if (!message) {
            return false;
        }

        const conversation = await Conversation.findById(
            message.conversation
        );

        if (!conversation || !conversation.isGroup) {
            return false;
        }

        const recipientIds = conversation.participants
            .map((id) => id.toString())
            .filter(
                (id) => id !== message.sender.toString()
            );

        const deliveredUserIds =
            message.deliveryStatus.map(
                (status) => status.user.toString()
            );

        const allDelivered =
            recipientIds.length > 0 &&
            recipientIds.every((userId) =>
                deliveredUserIds.includes(userId)
            );

        await Message.findByIdAndUpdate(messageId, {
            $set: {
                isDelivered: allDelivered,
            },
        });

        console.log(
            `Group message ${messageId} delivery status:`,
            allDelivered
        );

        return allDelivered;
    } catch (error) {
        console.error(
            'Group delivery status update error:',
            error.message
        );

        return false;
    }
};

// =====================================================
// UPDATE GROUP READ STATUS
// =====================================================

const updateGroupReadStatus = async (messageId) => {
    try {
        // Always get the latest version from MongoDB
        const message = await Message.findById(messageId);

        if (!message) {
            return false;
        }

        const conversation = await Conversation.findById(
            message.conversation
        );

        if (!conversation || !conversation.isGroup) {
            return false;
        }

        const recipientIds = conversation.participants
            .map((id) => id.toString())
            .filter(
                (id) => id !== message.sender.toString()
            );

        const readUserIds = message.readStatus.map(
            (status) => status.user.toString()
        );

        const allRead =
            recipientIds.length > 0 &&
            recipientIds.every((userId) =>
                readUserIds.includes(userId)
            );

        await Message.findByIdAndUpdate(messageId, {
            $set: {
                isRead: allRead,
            },
        });

        console.log(
            `Group message ${messageId} read status:`,
            allRead
        );

        return allRead;
    } catch (error) {
        console.error(
            'Group read status update error:',
            error.message
        );

        return false;
    }
};

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
    // SOCKET.IO JWT AUTHENTICATION
    // =====================================================

    io.use(async (socket, next) => {
        try {
            // JWT sent by frontend during Socket.IO connection
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(
                    new Error('Authentication token missing')
                );
            }

            // Verify JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            // Find authenticated user
            const user = await User.findById(
                decoded.id
            ).select('-password');

            if (!user) {
                return next(
                    new Error('User not found')
                );
            }

            // Store authenticated user
            socket.user = user;

            // Store authenticated user ID
            socket.userId = user._id.toString();

            next();
        } catch (error) {
            console.error(
                'Socket authentication error:',
                error.message
            );

            next(
                new Error(
                    'Invalid or expired token'
                )
            );
        }
    });

    // =====================================================
    // SELF-DESTRUCT MESSAGE WATCHER
    // =====================================================

    const messageChangeStream = Message.watch([], {
        fullDocumentBeforeChange: 'required',
    });

    messageChangeStream.on(
        'change',
        async (change) => {
            try {
                // Only care about deleted messages
                if (
                    change.operationType !== 'delete'
                ) {
                    return;
                }

                // Get deleted message before deletion
                const deletedMessage =
                    change.fullDocumentBeforeChange;

                if (!deletedMessage) {
                    console.log(
                        'Deleted message pre-image unavailable:',
                        change.documentKey._id.toString()
                    );

                    return;
                }

                // Only self-destruct messages
                if (!deletedMessage.isSelfDestruct) {
                    return;
                }

                const messageId =
                    deletedMessage._id.toString();

                const conversationId =
                    deletedMessage.conversation?.toString();

                console.log(
                    `Self-destruct message expired: ${messageId}`
                );

                // =================================================
                // DIRECT MESSAGE
                // =================================================

                if (deletedMessage.receiver) {
                    const receiverId =
                        deletedMessage.receiver.toString();

                    const receiverSocket =
                        onlineUsers.get(receiverId);

                    if (receiverSocket) {
                        io.to(receiverSocket).emit(
                            'messageExpired',
                            {
                                messageId,
                                conversationId,
                            }
                        );

                        console.log(
                            `messageExpired sent to receiver ${receiverId}`
                        );
                    }

                    // Notify sender if online
                    const senderId =
                        deletedMessage.sender?.toString();

                    if (senderId) {
                        const senderSocket =
                            onlineUsers.get(senderId);

                        if (senderSocket) {
                            io.to(senderSocket).emit(
                                'messageExpired',
                                {
                                    messageId,
                                    conversationId,
                                }
                            );

                            console.log(
                                `messageExpired sent to sender ${senderId}`
                            );
                        }
                    }

                    return;
                }

                // =================================================
                // GROUP MESSAGE
                // =================================================

                if (conversationId) {
                    const conversation =
                        await Conversation.findById(
                            conversationId
                        );

                    if (
                        !conversation ||
                        !conversation.isGroup
                    ) {
                        return;
                    }

                    for (
                        const participantId of
                            conversation.participants
                    ) {
                        const participantIdString =
                            participantId.toString();

                        const participantSocket =
                            onlineUsers.get(
                                participantIdString
                            );

                        if (participantSocket) {
                            io.to(
                                participantSocket
                            ).emit(
                                'messageExpired',
                                {
                                    messageId,
                                    conversationId,
                                }
                            );

                            console.log(
                                `messageExpired sent to group participant ${participantIdString}`
                            );
                        }
                    }
                }
            } catch (error) {
                console.error(
                    'Self-destruct watcher error:',
                    error.message
                );
            }
        }
    );

    messageChangeStream.on(
        'error',
        (error) => {
            console.error(
                'Self-destruct change stream error:',
                error.message
            );
        }
    );

    // =====================================================
    // SOCKET CONNECTION
    // =====================================================

    io.on('connection', (socket) => {
        console.log(
            'Authenticated User Connected:',
            socket.id,
            'User:',
            socket.userId
        );

        
        // =================================================
        // USER JOIN
        // =================================================

        socket.on('join', async () => {
            try {
                // IMPORTANT:
                // User identity comes from verified JWT.
                const userIdString =
                    socket.userId;

                if (!userIdString) {
                    return;
                }

                onlineUsers.set(
                    userIdString,
                    socket.id
                );

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
                        userId: userIdString,
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
                        const message of
                            undeliveredMessages
                    ) {
                        io.to(socket.id).emit(
                            'newMessage',
                            message
                        );

                        message.isDelivered = true;

                        await message.save();

                        const senderSocket =
                            onlineUsers.get(
                                message.sender.toString()
                            );

                        if (senderSocket) {
                            io.to(
                                senderSocket
                            ).emit(
                                'deliveryReceipt',
                                {
                                    messageId:
                                        message._id,
                                    isDelivered:
                                        true,
                                }
                            );
                        }
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
                    // Authenticated user
                    const userId =
                        socket.userId;

                    if (!userId) {
                        return;
                    }

                    const message =
                        await Message.findById(
                            messageId
                        );

                    if (!message) {
                        return;
                    }

                    const conversation =
                        await Conversation.findById(
                            message.conversation
                        );

                    if (!conversation) {
                        return;
                    }

                    // =================================================
                    // GROUP MESSAGE
                    // =================================================

                    if (conversation.isGroup) {
                        const isParticipant =
                            conversation.participants.some(
                                (participant) =>
                                    participant.toString() ===
                                    userId.toString()
                            );

                        if (!isParticipant) {
                            return;
                        }

                        // Sender cannot deliver own message
                        if (
                            message.sender.toString() ===
                            userId.toString()
                        ) {
                            return;
                        }

                        // Add delivery status only once
                        await Message.updateOne(
                            {
                                _id: messageId,
                                'deliveryStatus.user': {
                                    $ne: userId,
                                },
                            },
                            {
                                $push: {
                                    deliveryStatus: {
                                        user: userId,
                                        deliveredAt:
                                            new Date(),
                                    },
                                },
                            }
                        );

                        const allDelivered =
                            await updateGroupDeliveryStatus(
                                messageId
                            );

                        const senderSocket =
                            onlineUsers.get(
                                message.sender.toString()
                            );

                        if (senderSocket) {
                            io.to(
                                senderSocket
                            ).emit(
                                'deliveryReceipt',
                                {
                                    messageId,
                                    conversationId:
                                        message.conversation,
                                    deliveredBy:
                                        userId,
                                    isDelivered:
                                        true,
                                    allDelivered:
                                        allDelivered,
                                }
                            );
                        }

                        console.log(
                            `Group message ${messageId} ` +
                            `delivered to ${userId}`
                        );

                        return;
                    }

                    // =================================================
                    // DIRECT MESSAGE
                    // =================================================

                    if (
                        message.receiver &&
                        message.receiver.toString() !==
                            userId.toString()
                    ) {
                        return;
                    }

                    await Message.findByIdAndUpdate(
                        messageId,
                        {
                            $set: {
                                isDelivered:
                                    true,
                            },
                        }
                    );

                    const senderSocket =
                        onlineUsers.get(
                            message.sender.toString()
                        );

                    if (senderSocket) {
                        io.to(
                            senderSocket
                        ).emit(
                            'deliveryReceipt',
                            {
                                messageId,
                                isDelivered:
                                    true,
                            }
                        );
                    }
                } catch (error) {
                    console.error(
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
                    const { messageId } = data;

                    // Authenticated user
                    const userId =
                        socket.userId;

                    if (!userId) {
                        return;
                    }

                    const message =
                        await Message.findById(
                            messageId
                        );

                    if (!message) {
                        return;
                    }

                    const conversation =
                        await Conversation.findById(
                            message.conversation
                        );

                    if (!conversation) {
                        return;
                    }

                    // =================================================
                    // GROUP MESSAGE
                    // =================================================

                    if (conversation.isGroup) {
                        const isParticipant =
                            conversation.participants.some(
                                (participant) =>
                                    participant.toString() ===
                                    userId.toString()
                            );

                        if (!isParticipant) {
                            return;
                        }

                        // Sender cannot read own message
                        if (
                            message.sender.toString() ===
                            userId.toString()
                        ) {
                            return;
                        }

                        // Add read status only once
                        await Message.updateOne(
                            {
                                _id: messageId,
                                'readStatus.user': {
                                    $ne: userId,
                                },
                            },
                            {
                                $push: {
                                    readStatus: {
                                        user: userId,
                                        readAt:
                                            new Date(),
                                    },
                                },
                            }
                        );

                        const allRead =
                            await updateGroupReadStatus(
                                messageId
                            );

                        const senderSocket =
                            onlineUsers.get(
                                message.sender.toString()
                            );

                        if (senderSocket) {
                            io.to(
                                senderSocket
                            ).emit(
                                'readReceipt',
                                {
                                    messageId,
                                    conversationId:
                                        message.conversation,
                                    readBy: userId,
                                    isRead: true,
                                    allRead:
                                        allRead,
                                }
                            );
                        }

                        console.log(
                            `Group message ${messageId} ` +
                            `read by ${userId}`
                        );

                        return;
                    }

                    // =================================================
                    // DIRECT MESSAGE
                    // =================================================

                    if (
                        message.receiver &&
                        message.receiver.toString() !==
                            userId.toString()
                    ) {
                        return;
                    }

                    await Message.findByIdAndUpdate(
                        messageId,
                        {
                            $set: {
                                isRead: true,
                            },
                        }
                    );

                    const senderSocket =
                        onlineUsers.get(
                            message.sender.toString()
                        );

                    if (senderSocket) {
                        io.to(
                            senderSocket
                        ).emit(
                            'readReceipt',
                            {
                                messageId,
                                isRead: true,
                                readBy: userId,
                            }
                        );
                    }
                } catch (error) {
                    console.error(
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
            async (data) => {
                try {
                    const {
                        receiverId,
                        conversationId,
                    } = data;

                    // Authenticated user identity
                    const userId =
                        socket.userId;

                    if (!userId) {
                        return;
                    }

                    // =================================================
                    // GROUP TYPING
                    // =================================================

                    if (conversationId) {
                        const conversation =
                            await Conversation.findById(
                                conversationId
                            ).populate(
                                'participants',
                                'name'
                            );

                        if (!conversation) {
                            return;
                        }

                        if (!conversation.isGroup) {
                            return;
                        }

                        // Verify authenticated user belongs
                        // to this group
                        const isParticipant =
                            conversation.participants.some(
                                (participant) =>
                                    participant._id.toString() ===
                                    userId.toString()
                            );

                        if (!isParticipant) {
                            return;
                        }

                        // Send typing event to all
                        // other group participants
                        for (
                            const participant of
                                conversation.participants
                        ) {
                            const participantId =
                                participant._id.toString();

                            // Don't send to the person typing
                            if (
                                participantId ===
                                userId.toString()
                            ) {
                                continue;
                            }

                            const participantSocket =
                                onlineUsers.get(
                                    participantId
                                );

                            if (participantSocket) {
                                io.to(
                                    participantSocket
                                ).emit(
                                    'typing',
                                    {
                                        conversationId,

                                        userId:
                                            userId.toString(),

                                        senderId:
                                            userId.toString(),

                                        userName:
                                            reqUserName(
                                                conversation,
                                                userId
                                            ),
                                    }
                                );
                            }
                        }

                        return;
                    }

                    // =================================================
                    // DIRECT TYPING
                    // =================================================

                    if (!receiverId) {
                        return;
                    }

                    const receiverSocket =
                        onlineUsers.get(
                            receiverId.toString()
                        );

                    if (receiverSocket) {
                        io.to(
                            receiverSocket
                        ).emit(
                            'typing',
                            {
                                senderId:
                                    userId.toString(),
                            }
                        );
                    }
                } catch (error) {
                    console.error(
                        'Typing error:',
                        error.message
                    );
                }
            }
        );

        // =====================================================
        // STOP TYPING
        // =====================================================

        socket.on(
            'stopTyping',
            async (data) => {
                try {
                    const {
                        receiverId,
                        conversationId,
                    } = data;

                    // Authenticated user identity
                    const userId =
                        socket.userId;

                    if (!userId) {
                        return;
                    }

                    // =================================================
                    // GROUP STOP TYPING
                    // =================================================

                    if (conversationId) {
                        const conversation =
                            await Conversation.findById(
                                conversationId
                            ).populate(
                                'participants',
                                'name'
                            );

                        if (!conversation) {
                            return;
                        }

                        if (!conversation.isGroup) {
                            return;
                        }

                        // Verify authenticated user belongs
                        // to this group
                        const isParticipant =
                            conversation.participants.some(
                                (participant) =>
                                    participant._id.toString() ===
                                    userId.toString()
                            );

                        if (!isParticipant) {
                            return;
                        }

                        // Notify all other participants
                        for (
                            const participant of
                                conversation.participants
                        ) {
                            const participantId =
                                participant._id.toString();

                            if (
                                participantId ===
                                userId.toString()
                            ) {
                                continue;
                            }

                            const participantSocket =
                                onlineUsers.get(
                                    participantId
                                );

                            if (participantSocket) {
                                io.to(
                                    participantSocket
                                ).emit(
                                    'stopTyping',
                                    {
                                        conversationId,

                                        userId:
                                            userId.toString(),

                                        senderId:
                                            userId.toString(),
                                    }
                                );
                            }
                        }

                        return;
                    }

                    // =================================================
                    // DIRECT STOP TYPING
                    // =================================================

                    if (!receiverId) {
                        return;
                    }

                    const receiverSocket =
                        onlineUsers.get(
                            receiverId.toString()
                        );

                    if (receiverSocket) {
                        io.to(
                            receiverSocket
                        ).emit(
                            'stopTyping',
                            {
                                senderId:
                                    userId.toString(),
                            }
                        );
                    }
                } catch (error) {
                    console.error(
                        'Stop typing error:',
                        error.message
                    );
                }
            }
        );

                // =====================================================
        // AUDIO / VIDEO CALLING - WEBRTC SIGNALING
        // =====================================================

        // START CALL
        socket.on('callUser', (data) => {
            try {
                const {
                    receiverId,
                    callId,
                    callType,
                    offer
                } = data;

                const callerId = socket.userId;

                if (!callerId || !receiverId || !callId || !callType) {
                    return;
                }

                // Only allow audio or video calls
                if (!['audio', 'video'].includes(callType)) {
                    return;
                }

                const receiverSocket =
                    onlineUsers.get(receiverId.toString());

                // Receiver is offline
                if (!receiverSocket) {
                    socket.emit('callUnavailable', {
                        callId,
                        receiverId,
                        message: 'User is offline'
                    });

                    return;
                }

                // Send incoming call to receiver
                io.to(receiverSocket).emit('incomingCall', {
                    callId,
                    callerId,
                    receiverId: receiverId.toString(),
                    callType,
                    offer
                });

                console.log(
                    `${callType} call started: ${callerId} -> ${receiverId}`
                );

            } catch (error) {
                console.error(
                    'Call user error:',
                    error.message
                );
            }
        });


        // =====================================================
        // CALL ACCEPTED
        // =====================================================

        socket.on('callAccepted', (data) => {
            try {
                const {
                    callerId,
                    callId,
                    answer
                } = data;

                const receiverId = socket.userId;

                if (!callerId || !callId || !answer) {
                    return;
                }

                const callerSocket =
                    onlineUsers.get(callerId.toString());

                if (!callerSocket) {
                    return;
                }

                io.to(callerSocket).emit('callAccepted', {
                    callId,
                    callerId: callerId.toString(),
                    receiverId,
                    answer
                });

                console.log(
                    `Call accepted: ${receiverId} -> ${callerId}`
                );

            } catch (error) {
                console.error(
                    'Call accepted error:',
                    error.message
                );
            }
        });


        // =====================================================
        // CALL REJECTED
        // =====================================================

        socket.on('callRejected', (data) => {
            try {
                const {
                    callerId,
                    callId
                } = data;

                const receiverId = socket.userId;

                if (!callerId || !callId) {
                    return;
                }

                const callerSocket =
                    onlineUsers.get(callerId.toString());

                if (!callerSocket) {
                    return;
                }

                io.to(callerSocket).emit('callRejected', {
                    callId,
                    callerId: callerId.toString(),
                    receiverId,
                    message: 'Call rejected'
                });

                console.log(
                    `Call rejected: ${receiverId} -> ${callerId}`
                );

            } catch (error) {
                console.error(
                    'Call rejected error:',
                    error.message
                );
            }
        });


        // =====================================================
        // WEBRTC OFFER
        // =====================================================

        socket.on('webrtcOffer', (data) => {
            try {
                const {
                    receiverId,
                    callId,
                    offer
                } = data;

                const senderId = socket.userId;

                if (!receiverId || !callId || !offer) {
                    return;
                }

                const receiverSocket =
                    onlineUsers.get(receiverId.toString());

                if (!receiverSocket) {
                    return;
                }

                io.to(receiverSocket).emit('webrtcOffer', {
                    callId,
                    senderId,
                    receiverId: receiverId.toString(),
                    offer
                });

            } catch (error) {
                console.error(
                    'WebRTC offer error:',
                    error.message
                );
            }
        });


        // =====================================================
        // WEBRTC ANSWER
        // =====================================================

        socket.on('webrtcAnswer', (data) => {
            try {
                const {
                    receiverId,
                    callId,
                    answer
                } = data;

                const senderId = socket.userId;

                if (!receiverId || !callId || !answer) {
                    return;
                }

                const receiverSocket =
                    onlineUsers.get(receiverId.toString());

                if (!receiverSocket) {
                    return;
                }

                io.to(receiverSocket).emit('webrtcAnswer', {
                    callId,
                    senderId,
                    receiverId: receiverId.toString(),
                    answer
                });

            } catch (error) {
                console.error(
                    'WebRTC answer error:',
                    error.message
                );
            }
        });


        // =====================================================
        // ICE CANDIDATE
        // =====================================================

        socket.on('iceCandidate', (data) => {
            try {
                const {
                    receiverId,
                    callId,
                    candidate
                } = data;

                const senderId = socket.userId;

                if (!receiverId || !callId || !candidate) {
                    return;
                }

                const receiverSocket =
                    onlineUsers.get(receiverId.toString());

                if (!receiverSocket) {
                    return;
                }

                io.to(receiverSocket).emit('iceCandidate', {
                    callId,
                    senderId,
                    receiverId: receiverId.toString(),
                    candidate
                });

            } catch (error) {
                console.error(
                    'ICE candidate error:',
                    error.message
                );
            }
        });


        // =====================================================
        // END CALL
        // =====================================================

        socket.on('callEnded', (data) => {
            try {
                const {
                    receiverId,
                    callId
                } = data;

                const callerId = socket.userId;

                if (!receiverId || !callId) {
                    return;
                }

                const receiverSocket =
                    onlineUsers.get(receiverId.toString());

                if (!receiverSocket) {
                    return;
                }

                io.to(receiverSocket).emit('callEnded', {
                    callId,
                    callerId,
                    receiverId: receiverId.toString()
                });

                console.log(
                    `Call ended: ${callerId} -> ${receiverId}`
                );

            } catch (error) {
                console.error(
                    'Call ended error:',
                    error.message
                );
            }
        });


        // =====================================================
        // CALL BUSY
        // =====================================================

        socket.on('callBusy', (data) => {
            try {
                const {
                    callerId,
                    callId
                } = data;

                const receiverId = socket.userId;

                if (!callerId || !callId) {
                    return;
                }

                const callerSocket =
                    onlineUsers.get(callerId.toString());

                if (!callerSocket) {
                    return;
                }

                io.to(callerSocket).emit('callBusy', {
                    callId,
                    callerId: callerId.toString(),
                    receiverId,
                    message: 'User is busy'
                });

            } catch (error) {
                console.error(
                    'Call busy error:',
                    error.message
                );
            }
        });

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