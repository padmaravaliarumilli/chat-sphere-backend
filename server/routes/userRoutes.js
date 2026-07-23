const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const { getProfile, updateProfile } = require("../controllers/userController");
const {
  updatePreferences,
} = require("../controllers/preferenceController");

router.get("/profile", protect, getProfile);
router.put("/profile",protect,updateProfile);
router.put("/preferences", protect, updatePreferences);

module.exports = router;