const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

const USER_ID = '6a6878227ba131fa4384c5ce';

const socket = io(SERVER_URL, {
    transports: ['websocket'],
});

socket.on('connect', () => {
    console.log('');
    console.log('================================');
    console.log('PRIYANKA SOCKET CONNECTED');
    console.log('================================');

    console.log('Socket ID:', socket.id);

    socket.emit('join', USER_ID);

    console.log('Joined as Priyanka:', USER_ID);

    console.log('');
    console.log('Waiting for group messages...');
    console.log('');
});

// =====================================================
// NEW MESSAGE
// =====================================================

socket.on('newMessage', (message) => {
    console.log(`
================================
NEW GROUP MESSAGE
================================
Message ID: ${message._id}
Conversation: ${message.conversation}
Sender: ${message.sender}
Text: ${message.text}
================================
`);

    socket.emit('messageDelivered', message._id);

    socket.emit('messageRead', {
        messageId: message._id,
    });
});

// =====================================================
// DELIVERY RECEIPT
// =====================================================

socket.on('deliveryReceipt', (data) => {
    console.log('');
    console.log('DELIVERY RECEIPT');

    console.log('Message ID:', data.messageId);
    console.log('Delivered By:', data.deliveredBy);
    console.log('Is Delivered:', data.isDelivered);

    console.log('');
});

// =====================================================
// READ RECEIPT
// =====================================================

socket.on('readReceipt', (data) => {
    console.log('');
    console.log('READ RECEIPT');

    console.log('Message ID:', data.messageId);
    console.log('Read By:', data.readBy);
    console.log('Is Read:', data.isRead);

    console.log('');
});

// =====================================================
// USER ONLINE
// =====================================================

socket.on('userOnline', (data) => {
    console.log('User online:', data.userId);
});

// =====================================================
// USER OFFLINE
// =====================================================

socket.on('userOffline', (data) => {
    console.log('User offline:', data.userId, 'Last seen:', data.lastSeen);
});

// =====================================================
// CONNECTION ERROR
// =====================================================

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
});

// =====================================================
// DISCONNECT
// =====================================================

socket.on('disconnect', (reason) => {
    console.log('Priyanka socket disconnected:', reason);
});
