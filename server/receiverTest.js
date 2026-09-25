const { io } = require('socket.io-client');

const USER_ID = '6a6729cae7507decae92a78b';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Receiver Connected:', socket.id);

    socket.emit('join', USER_ID);
});

socket.on('userOnline', (data) => {
    console.log('🟢 User Online:');

    console.log(data);
});

socket.on('userOffline', (data) => {
    console.log('⚫ User Offline:');

    console.log(data);
});

socket.on('newMessage', (message) => {
    console.log('📩 Message Received:');

    console.log(message);

    socket.emit('messageDelivered', message._id);

    console.log('✅ Delivery acknowledgement sent');
});

socket.on('messageDeleted', (data) => {
    console.log('🗑️ Message Deleted:');

    console.log(data);
});

socket.on('typing', (data) => {
    console.log('✍️ User is typing:');

    console.log(data);
});

socket.on('stopTyping', (data) => {
    console.log('🛑 User stopped typing:');

    console.log(data);
});
