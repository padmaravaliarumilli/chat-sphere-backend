const { io } = require('socket.io-client');

// =====================================================
// CONFIGURATION
// =====================================================

const SERVER_URL = 'http://localhost:3000';

// IMPORTANT:
// Paste a VALID JWT token obtained from your login API.
//
// Example:
// POST http://localhost:3000/api/auth/login
//
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNjg2ZWVlNGFmNjEwZGRlODY5Mzc3YSIsImlhdCI6MTc5MDAwNDI0NiwiZXhwIjoxNzkwNjA5MDQ2fQ.Lr2Mlrd1HOjxWnCOswtpRDWOceSjwZPaAKOF3Rdxx0w';

// =====================================================
// TEST USER / TARGET IDs
// =====================================================

// Receiver for direct typing test
const RECEIVER_ID = '6a6729cae7507decae92a78b';

// Your group conversation ID
const GROUP_CONVERSATION_ID = '6aac02a26bb82e498a18699b';

// =====================================================
// CONNECT TO SOCKET.IO
// =====================================================

const socket = io(SERVER_URL, {
    transports: ['websocket'],

    // JWT authentication
    auth: {
        token: JWT_TOKEN,
    },
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

    // IMPORTANT:
    // Do NOT send userId here.
    //
    // OLD:
    // socket.emit('join', RECEIVER_ID);
    //
    // NEW:
    socket.emit('join');

    console.log('Join event sent using authenticated JWT identity.');

    console.log('');
    console.log('Waiting for messages/events...');
    console.log('');
});

// =====================================================
// JOIN ERROR
// =====================================================

socket.on('joinError', (data) => {
    console.log('');
    console.log('================================');
    console.log('JOIN ERROR');
    console.log('================================');

    console.log(data);

    console.log('');
});

// =====================================================
// NEW MESSAGE
// =====================================================

socket.on('newMessage', (message) => {
    console.log('');
    console.log('================================');
    console.log('NEW MESSAGE RECEIVED');
    console.log('================================');

    console.log('Message ID:', message._id);
    console.log('Sender:', message.sender);
    console.log('Conversation:', message.conversation);
    console.log('Text:', message.text);
    console.log('Message Type:', message.messageType);

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
// DIRECT TYPING
// =====================================================

socket.on('typing', (data) => {
    console.log('');
    console.log('================================');
    console.log('TYPING EVENT RECEIVED');
    console.log('================================');

    console.log('Conversation ID:', data.conversationId);
    console.log('User ID:', data.userId);
    console.log('Sender ID:', data.senderId);
    console.log('User Name:', data.userName);

    console.log('================================');
    console.log('');
});

// =====================================================
// STOP TYPING
// =====================================================

socket.on('stopTyping', (data) => {
    console.log('');
    console.log('================================');
    console.log('STOP TYPING EVENT RECEIVED');
    console.log('================================');

    console.log('Conversation ID:', data.conversationId);
    console.log('User ID:', data.userId);
    console.log('Sender ID:', data.senderId);
    console.log('User Name:', data.userName);

    console.log('================================');
    console.log('');
});

// =====================================================
// DELIVERY RECEIPT
// =====================================================

socket.on('deliveryReceipt', (data) => {
    console.log('');
    console.log('================================');
    console.log('DELIVERY RECEIPT');
    console.log('================================');

    console.log(data);

    console.log('================================');
    console.log('');
});

// =====================================================
// READ RECEIPT
// =====================================================

socket.on('readReceipt', (data) => {
    console.log('');
    console.log('================================');
    console.log('READ RECEIPT');
    console.log('================================');

    console.log(data);

    console.log('================================');
    console.log('');
});

// =====================================================
// USER ONLINE
// =====================================================

socket.on('userOnline', (data) => {
    console.log('');
    console.log('USER ONLINE');
    console.log('User ID:', data.userId);
    console.log('');
});

// =====================================================
// USER OFFLINE
// =====================================================

socket.on('userOffline', (data) => {
    console.log('');
    console.log('USER OFFLINE');
    console.log('User ID:', data.userId);
    console.log('');
});

// =====================================================
// CONNECTION ERROR
// =====================================================

socket.on('connect_error', (error) => {
    console.error('');
    console.error('================================');
    console.error('SOCKET CONNECTION ERROR');
    console.error('================================');

    console.error('Error:', error.message);

    console.error('================================');
    console.error('');
});

// =====================================================
// DISCONNECT
// =====================================================

socket.on('disconnect', (reason) => {
    console.log('');
    console.log('================================');
    console.log('SOCKET DISCONNECTED');
    console.log('================================');

    console.log('Reason:', reason);

    console.log('');
});

// =====================================================
// TEST COMMANDS
// =====================================================

// Direct typing test
function testDirectTyping() {
    console.log('');
    console.log('Sending direct typing event...');

    socket.emit('typing', {
        receiverId: RECEIVER_ID,
    });
}

// Direct stop typing test
function testDirectStopTyping() {
    console.log('');
    console.log('Sending direct stop typing event...');

    socket.emit('stopTyping', {
        receiverId: RECEIVER_ID,
    });
}

// Group typing test
function testGroupTyping() {
    console.log('');
    console.log('Sending group typing event...');

    socket.emit('typing', {
        conversationId: GROUP_CONVERSATION_ID,
    });
}

// Group stop typing test
function testGroupStopTyping() {
    console.log('');
    console.log('Sending group stop typing event...');

    socket.emit('stopTyping', {
        conversationId: GROUP_CONVERSATION_ID,
    });
}

// =====================================================
// OPTIONAL AUTOMATIC TESTS
// =====================================================

socket.on('connect', () => {

    // Wait 2 seconds after connection
    // before testing direct typing.

    setTimeout(() => {
        testDirectTyping();
    }, 2000);

    // Stop typing after 5 seconds
    setTimeout(() => {
        testDirectStopTyping();
    }, 5000);

    // Group typing after 8 seconds
    setTimeout(() => {
        testGroupTyping();
    }, 8000);

    // Group stop typing after 11 seconds
    setTimeout(() => {
        testGroupStopTyping();
    }, 11000);
});