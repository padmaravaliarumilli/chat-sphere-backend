const Bookmark = require("../models/bookmarkModel");
const Message = require("../models/Message");

const createBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.body;

        // Validate messageId
        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "messageId is required",
            });
        }

        // Check whether message exists
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        // Check if already bookmarked
        const existingBookmark = await Bookmark.findOne({
            user: userId,
            message: messageId,
        });

        if (existingBookmark) {
            return res.status(409).json({
                success: false,
                message: "Message is already bookmarked",
                data: {
                    bookmark: existingBookmark,
                },
            });
        }

        // Create bookmark
        const bookmark = await Bookmark.create({
            user: userId,
            message: messageId,
        });

        return res.status(201).json({
            success: true,
            message: "Message bookmarked successfully",
            data: {
                bookmark,
            },
        });
    } catch (error) {
        console.error("Create bookmark error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to bookmark message",
            error: error.message,
        });
    }
};

const getBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;

        const bookmarks = await Bookmark.find({
            user: userId,
        })
            .populate({
                path: "message",
                populate: {
                    path: "sender",
                    select: "name email profileImage",
                },
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Bookmarks fetched successfully",
            data: {
                bookmarks,
                count: bookmarks.length,
            },
        });
    } catch (error) {
        console.error("Get bookmarks error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookmarks",
            error: error.message,
        });
    }
};

const checkBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        // Validate messageId
        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "messageId is required",
            });
        }

        // Check bookmark
        const bookmark = await Bookmark.findOne({
            user: userId,
            message: messageId,
        });

        return res.status(200).json({
            success: true,
            message: "Bookmark status fetched successfully",
            data: {
                isBookmarked: !!bookmark,
                bookmark: bookmark || null,
            },
        });
    } catch (error) {
        console.error("Check bookmark error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to check bookmark status",
            error: error.message,
        });
    }
};

const deleteBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        // Validate messageId
        if (!messageId) {
            return res.status(400).json({
                success: false,
                message: "messageId is required",
            });
        }

        // Find and delete only the logged-in user's bookmark
        const bookmark = await Bookmark.findOneAndDelete({
            user: userId,
            message: messageId,
        });

        // Bookmark not found
        if (!bookmark) {
            return res.status(404).json({
                success: false,
                message: "Bookmark not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bookmark deleted successfully",
            data: {
                bookmark,
            },
        });
    } catch (error) {
        console.error("Delete bookmark error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete bookmark",
            error: error.message,
        });
    }
};

module.exports = {
    createBookmark,
    getBookmarks,
    checkBookmark,
    deleteBookmark,
};