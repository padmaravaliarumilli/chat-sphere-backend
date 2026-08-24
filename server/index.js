const cors = require('cors');
require('dotenv').config();

const express = require('express');
const http = require('http'); // NEW

const connectDB = require('./config/db');

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const { initializeSocket } = require('./socket/socket'); // NEW

const app = express();

connectDB();

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/media', mediaRoutes);

app.get('/', (req, res) => {
    res.send('Chat Sphere Backend Running...');
});

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

const PORT = process.env.PORT || 3000;

// Start HTTP Server instead of app.listen()
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
