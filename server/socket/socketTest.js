const { io } = require('socket.io-client');

// =====================================================
// CONFIGURATION
// =====================================================

const SERVER_URL = 'http://localhost:3000';

// IMPORTANT:
// Replace this with the RECEIVER'S MongoDB user _id.
const RECEIVER_ID = '6a6729cae7507decae92a78b';

// =====================================================
// CONNECT TO SOCKET.IO
// =====================================================

const socket = io(SERVER_URL, {
    transports: ['websocket'],
});

// =====================================================
// CONNECTION
// =====================================================

socket.on('connect', () => {
    console.log('');
    console.log('================================');
    console.log('SOCKET CONNECTED');
    console.log('================================');

    console.log('Socket ID:', socket.id);

    // Join as receiver
    socket.emit('join', RECEIVER_ID);

    console.log('Joined as receiver:', RECEIVER_ID);

    console.log('');
    console.log('Waiting for self-destruct message...');
    console.log('');
});

// =====================================================
// SELF-DESTRUCT MESSAGE EXPIRED
// =====================================================

socket.on('messageExpired', (data) => {
    console.log('');
    console.log('========================================');

    console.log('SELF-DESTRUCT MESSAGE EXPIRED');

    console.log('========================================');

    console.log('Message ID:', data.messageId);

    console.log('Conversation ID:', data.conversationId);

    console.log('========================================');

    console.log('');
});

// =====================================================
// NEW MESSAGE
// =====================================================

socket.on('newMessage', (message) => {
    console.log('');
    console.log('NEW MESSAGE RECEIVED');

    console.log('Message ID:', message._id);

    console.log('Text:', message.text);

    console.log('');
});

// =====================================================
// USER ONLINE
// =====================================================

socket.on('userOnline', (data) => {
    console.log('User online:', data.userId);
});

// =====================================================
// CONNECTION ERROR
// =====================================================

socket.on('connect_error', (error) => {
    console.error('');
    console.error('SOCKET CONNECTION ERROR');

    console.error(error.message);

    console.error('');
});

// =====================================================
// DISCONNECT
// =====================================================

socket.on('disconnect', (reason) => {
    console.log('');
    console.log('Socket disconnected');

    console.log('Reason:', reason);

    console.log('');
});
