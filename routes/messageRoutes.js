const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const upload = require('../middleware/uploadMiddleware');

const {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    getUnreadMessageCount,
    editMessage,
    deleteMessage,
    enableSelfDestruct,
    scheduleMessage,
    getScheduledMessages,
    cancelScheduledMessage,
    rescheduleMessage,
} = require('../controllers/messageController');

// Send message
router.post(
    '/send',
    protect,
    (req, res, next) => {
        upload.single('file')(req, res, (error) => {
            if (error) {

                // File too large
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        message: 'File too large',
                        maxSize: '100 MB',
                    });
                }

                // Invalid file type
                if (error.message?.includes('File type')) {
                    return res.status(400).json({
                        message: error.message,
                    });
                }

                // Other upload errors
                return res.status(400).json({
                    message: 'File upload failed',
                    error: error.message,
                });
            }

            next();
        });
    },
    sendMessage
);

// Get unread message count
router.get('/unread-count', protect, getUnreadMessageCount);

// Get scheduled messages
router.get('/scheduled', protect, getScheduledMessages);

// Cancel scheduled message
router.delete('/scheduled/:messageId', protect, cancelScheduledMessage);

// Reschedule scheduled message
router.put('/schedule/:messageId', protect, rescheduleMessage);

// Enable self-destruct
router.put('/self-destruct/:messageId', protect, enableSelfDestruct);

// Get all messages of a conversation
router.get('/:conversationId', protect, getMessages);

// Mark messages as read
router.put('/read/:conversationId', protect, markMessagesAsRead);

// Edit message
router.put('/:messageId', protect, editMessage);

// Delete message
router.delete('/:messageId', protect, deleteMessage);


// Schedule message
router.post('/schedule', protect, scheduleMessage);

module.exports = router;
