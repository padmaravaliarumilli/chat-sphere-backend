const { io } = require('socket.io-client');

const USER_ID = '6a686eee4af610dde869377a';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Sender Connected:', socket.id);

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

socket.on('deliveryReceipt', (data) => {
    console.log('✅ Delivery Receipt:');

    console.log(data);
});

socket.on('readReceipt', (data) => {
    console.log('✅ Read Receipt:');

    console.log(data);
});
