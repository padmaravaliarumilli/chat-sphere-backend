const express = require('express');
const router = express.Router();

const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
    getProfile,
    updateProfile,
    searchUsers,
    updateProfilePicture,
} = require('../controllers/userController');
const { updatePreferences } = require('../controllers/preferenceController');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile-picture', protect, upload.single('profilePic'), updateProfilePicture);
router.get('/search', protect, searchUsers);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
