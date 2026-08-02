const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getConversations,
  getOrCreateDirectConversation,
  createGroup,
  getGroupConversations,
  getGroupDetails,
  renameGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
  hideGroup,
} = require("../controllers/conversationController");

// Create or get a direct conversation
router.post("/direct", protect, getOrCreateDirectConversation);

router.post("/group", protect, createGroup);

// Get all conversations of the logged-in user
router.get("/", protect, getConversations);

//Get all group conversations of the logged-in user
router.get("/groups", protect, getGroupConversations);

//Get Group Details
router.get("/group/:groupId", protect, getGroupDetails);

//Rename Group
router.put("/group/:groupId", protect, renameGroup);

//Add Group Members
router.put("/group/:groupId/add-members", protect, addGroupMembers);

//Remove Group Members
router.put("/group/:groupId/remove-member", protect, removeGroupMember);

//Leave Group
router.put("/group/:groupId/leave", protect, leaveGroup);

//Delete Group
router.delete("/group/:groupId", protect, deleteGroup);

//Remove group only from particular chat list
router.put("/group/:groupId/hide",protect,hideGroup);



module.exports = router;
