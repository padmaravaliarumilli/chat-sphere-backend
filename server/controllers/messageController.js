const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, text, image } = req.body;

    // Validation
    if (!receiverId) {
      return res.status(400).json({
        message: "Receiver ID is required",
      });
    }

    if (!text && !image) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // If not, create a new conversation
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // Create new message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      text: text || "",
      image: image || "",
    });

    // Update conversation
    conversation.lastMessage = text || "📷 Image";
    conversation.lastMessageSender = senderId;
    conversation.lastMessageTime = new Date();

    await conversation.save();

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get Messages
const getMessages = async (req, res) => {
  try {

    const { conversationId } = req.params;

    const userId = req.user._id;


    // Find conversation
    const conversation = await Conversation.findById(conversationId);


    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }


    // Check if logged-in user belongs to conversation

   const isParticipant = conversation.participants.some(
  (id) => id.toString() === userId.toString()
);


    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to view this conversation",
      });
    }


    // Fetch messages

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .sort({ createdAt: 1 });


    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages,
    });


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Mark Messages as Read
const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;


    // Check conversation exists
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }


    // Check logged-in user belongs to conversation
    const isParticipant = conversation.participants.some(
      (id) => id.toString() === userId.toString()
    );


    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to access this conversation",
      });
    }


    // Update unread messages
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );


    res.status(200).json({
      message: "Messages marked as read successfully",
    });


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Get unread message count
const getUnreadMessageCount = async (req, res) => {
  try {

    const userId = req.user._id;


    const unreadCount = await Message.countDocuments({
      receiver: userId,
      isRead: false,
    });


    res.status(200).json({
      message: "Unread message count fetched successfully",
      unreadCount,
    });


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

// Edit Message
const editMessage = async (req, res) => {
  try {

    const userId = req.user._id;
    const { messageId } = req.params;
    const { text } = req.body;


    // Validate text
    if (!text) {
      return res.status(400).json({
        message: "Message text is required",
      });
    }


    // Find message
    const message = await Message.findById(messageId);


    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }


    // Check sender ownership
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can edit only your own messages",
      });
    }


    // Check if message is already read
    if (message.isRead) {
      return res.status(400).json({
        message: "You cannot edit a message after it is read",
      });
    }


    // Update message
    message.text = text;

    await message.save();


    res.status(200).json({
      message: "Message updated successfully",
      data: message,
    });


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};
// Delete Message
const deleteMessage = async (req, res) => {
  try {

    const userId = req.user._id;
    const { messageId } = req.params;


    // Find message
    const message = await Message.findById(messageId);


    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }


    // Check sender ownership
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can delete only your own messages",
      });
    }


    // Delete message
    await Message.findByIdAndDelete(messageId);


    res.status(200).json({
      message: "Message deleted successfully",
    });


  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  editMessage,
  deleteMessage,
};