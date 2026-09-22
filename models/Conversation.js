const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        // Users participating in the conversation
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],

        hiddenFor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],

        isGroup: {
            type: Boolean,
            default: false,
        },

        groupName: {
            type: String,
            default: '',
        },

        groupImage: {
            type: String,
            default: '',
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // Latest message (used for chat list preview)
        lastMessage: {
            type: String,
            default: '',
        },

        // User who sent the latest message
        lastMessageSender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // Time of the latest message
        lastMessageTime: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.Conversation ||
    mongoose.model('Conversation', conversationSchema);
