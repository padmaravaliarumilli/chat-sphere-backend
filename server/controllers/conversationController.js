const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Get all conversations of the logged-in user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all conversations where the logged-in user is a participant
    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: { $ne: userId },
    })
      .populate("participants", "name email profilePic status")
      .populate("lastMessageSender", "name profilePic")
      .sort({ lastMessageTime: -1 });

    res.status(200).json({
      message: "Conversations fetched successfully",
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Create or Get Direct Conversation
const getOrCreateDirectConversation = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    // Validation
    if (!receiverId) {
      return res.status(400).json({
        message: "Receiver ID is required",
      });
    }

    // Prevent chatting with yourself
    if (senderId.toString() === receiverId) {
      return res.status(400).json({
        message: "You cannot create a conversation with yourself",
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    })
      .populate("participants", "name email profilePic status")
      .populate("lastMessageSender", "name profilePic");

    // If conversation exists
    if (conversation) {
      return res.status(200).json({
        message: "Conversation fetched successfully",
        data: conversation,
      });
    }


    console.log("Sender:", senderId);
    console.log("Receiver:", receiverId);
    // Create new conversation
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
    });

    // Populate before sending response
    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email profilePic status")
      .populate("lastMessageSender", "name profilePic");

    res.status(201).json({
      message: "Conversation created successfully",
      data: conversation,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Create a new group conversation

const createGroup = async (req, res) => {
  try {
    const { groupName, participants } = req.body;

    if (!groupName) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    if (!participants || participants.length < 2) {
      return res.status(400).json({
        message: "A group must have at least 3 members including you",
      });
    }

    const members = [...new Set([...participants, req.user._id.toString()])];

    const group = await Conversation.create({
      participants: members,
      isGroup: true,
      groupName,
      createdBy: req.user._id,
    });

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "name email profilePic")
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Group created successfully",
      data: populatedGroup,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getGroupConversations = async (req, res) => {
  try {
    const groups = await Conversation.find({
      participants: req.user._id,
      isGroup: true,
    })
      .populate("participants", "name email profilePic")
      .populate("createdBy", "name email profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      message: "Group conversations fetched successfully",
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Get Group Details
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Conversation.findById(groupId)
      .populate("participants", "name email profilePic status")
      .populate("createdBy", "name email profilePic");

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isParticipant = group.participants.some(
      (participant) => participant._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    res.status(200).json({
      message: "Group details fetched successfully",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Rename Group
const renameGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName } = req.body;

    if (!groupName) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Only creator can rename group
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group creator can rename the group",
      });
    }

    group.groupName = groupName;

    await group.save();

    const updatedGroup = await Conversation.findById(group._id)
      .populate("participants", "name email profilePic")
      .populate("createdBy", "name email profilePic");

    res.status(200).json({
      message: "Group name updated successfully",
      data: updatedGroup,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Add Members
const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({
        message: "Members are required",
      });
    }

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Only creator can add members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group creator can add members",
      });
    }

    // Add only new members
    const newMembers = members.filter(
      (member) => !group.participants.includes(member)
    );

    group.participants.push(...newMembers);

    await group.save();

    const updatedGroup = await Conversation.findById(group._id)
      .populate("participants", "name email profilePic status")
      .populate("createdBy", "name email profilePic");

    res.status(200).json({
      message: "Members added successfully",
      data: updatedGroup,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Remove Group Members
const removeGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        message: "Member ID is required",
      });
    }

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Only creator can remove members
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group creator can remove members",
      });
    }

    // Prevent removing group creator
    if (memberId === group.createdBy.toString()) {
      return res.status(400).json({
        message: "Group creator cannot be removed",
      });
    }

    group.participants = group.participants.filter(
      (member) => member.toString() !== memberId
    );

    await group.save();

    const updatedGroup = await Conversation.findById(group._id)
      .populate("participants", "name email profilePic status")
      .populate("createdBy", "name email profilePic");

    res.status(200).json({
      message: "Member removed successfully",
      data: updatedGroup,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Leave Group
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Check if user is the creator
    if (group.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "Group creator cannot leave the group. Transfer ownership first.",
      });
    }

    // Check if user is a member
    const isMember = group.participants.some(
      (member) => member.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({
        message: "You are not a member of this group",
      });
    }

    // Remove user from participants
    group.participants = group.participants.filter(
      (member) => member.toString() !== req.user._id.toString()
    );

    await group.save();

    const updatedGroup = await Conversation.findById(group._id)
      .populate("participants", "name email profilePic status")
      .populate("createdBy", "name email profilePic");

    res.status(200).json({
      message: "You left the group successfully",
      data: updatedGroup,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Delete Group
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Only creator can delete group
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only group creator can delete the group",
      });
    }

    // Delete all messages in this group
    await Message.deleteMany({
      conversation: groupId,
    });

    // Delete group conversation
    await Conversation.findByIdAndDelete(groupId);


    res.status(200).json({
      message: "Group deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//Hide Group
// Hide Group from user's chat list
const hideGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        message: "Group not found",
      });
    }


    const isMember = group.participants.some(
      (member) => member.toString() === req.user._id.toString()
    );


    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }


    // Prevent duplicate entries
    if (!group.hiddenFor.includes(req.user._id)) {
      group.hiddenFor.push(req.user._id);
    }


    await group.save();


    res.status(200).json({
      message: "Group removed from your chat list",
    });


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getConversations,
  createGroup,
  getOrCreateDirectConversation,
  getGroupConversations,
  getGroupDetails,
  renameGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
  hideGroup,
};