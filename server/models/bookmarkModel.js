const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent the same user from bookmarking the same message twice
bookmarkSchema.index(
    { user: 1, message: 1 },
    { unique: true }
);

module.exports = mongoose.model("Bookmark", bookmarkSchema);