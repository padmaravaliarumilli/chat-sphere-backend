const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        text: {
            type: String,
            trim: true,
            default: '',
        },

        image: {
            type: String,
            default: '',
        },

        audio: {
            type: String,
            default: '',
        },

        messageType: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'document'],
            default: 'text',
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        isDelivered: {
            type: Boolean,
            default: false,
        },

        expiresAt: {
            type: Date,
            default: null,
        },

        isSelfDestruct: {
            type: Boolean,
            default: false,
        },

        // Scheduled message fields
        scheduledAt: {
            type: Date,
            default: null,
        },

        isScheduled: {
            type: Boolean,
            default: false,
        },

        scheduledStatus: {
            type: String,
            enum: ['pending', 'sent', 'cancelled'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
