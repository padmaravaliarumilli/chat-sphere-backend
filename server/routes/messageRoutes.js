const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  editMessage,
  deleteMessage
} = require("../controllers/messageController");

// Send a message
router.post("/send", protect, sendMessage);

// Get unread message count
router.get("/unread-count", protect, getUnreadMessageCount);

// Get all messages of a conversation
router.get("/:conversationId", protect, getMessages);

// Mark messages as read
router.put("/read/:conversationId", protect, markMessagesAsRead);

// Edit message
router.put("/:messageId", protect, editMessage);

// Delete message
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;