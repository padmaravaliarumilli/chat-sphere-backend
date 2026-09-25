const fs = require('fs');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const User = require('../models/User');
const getProfile = async (req, res) => {
    try {
        res.status(200).json({
            message: 'Profile fetched successfully',
            user: req.user,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, profilePic } = req.body;

        // User obtained from JWT middleware
        const user = req.user;

        // Update name
        if (name) {
            user.name = name;
        }

        // Update profile picture
        if (profilePic) {
            user.profilePic = profilePic;
        }

        // Save changes
        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic,
                status: user.status,
            },
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;

        // Check search query
        if (!q || !q.trim()) {
            return res.status(400).json({
                message: 'Search query is required',
            });
        }

        const search = q.trim();

        // Search by name OR email
        // Exclude the currently logged-in user
        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [
                {
                    name: {
                        $regex: search,
                        $options: 'i',
                    },
                },
                {
                    email: {
                        $regex: search,
                        $options: 'i',
                    },
                },
            ],
        })
            .select('_id name email profilePic status')
            .limit(20);

        res.status(200).json({
            message: 'Users fetched successfully',
            users,
        });
    } catch (error) {
        console.error('Search users error:', error);

        res.status(500).json({
            message: 'Failed to search users',
        });
    }
};
const updateProfilePicture = async (req, res) => {
    try {
        // Check if image was selected
        if (!req.file) {
            return res.status(400).json({
                message: 'Please select a profile picture',
            });
        }

        // Profile picture maximum size: 10 MB
        const maxSize = 10 * 1024 * 1024;

        if (req.file.size > maxSize) {
            // Delete temporary file
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                message: 'Profile picture must not exceed 10 MB',
            });
        }

        // Only allow images
        if (!req.file.mimetype.startsWith('image/')) {
            // Delete temporary file
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                message: 'Profile picture must be an image',
            });
        }

        try {
            // Upload image to Cloudinary
            const result = await uploadToCloudinary(
                req.file.path,
                'chat-sphere/profile-pictures',
                'image'
            );

            // Update logged-in user's profile picture
            const user = req.user;

            user.profilePic = result.secure_url;

            await user.save();

            return res.status(200).json({
                message: 'Profile picture updated successfully',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePic: user.profilePic,
                    status: user.status,
                },
            });

        } finally {
            // Delete temporary file
            if (req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (deleteError) {
                    console.error(
                        'Failed to delete temporary profile picture:',
                        deleteError.message
                    );
                }
            }
        }

    } catch (error) {
        console.error('Profile picture update error:', error);

        res.status(500).json({
            message: 'Failed to update profile picture',
            error: error.message,
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    searchUsers,
    updateProfilePicture,
};
