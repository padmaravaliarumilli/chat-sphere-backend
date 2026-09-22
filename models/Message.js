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
            default: null,
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

        fileUrl: {
            type: String,
            default: '',
        },

        fileName: {
            type: String,
            default: '',
        },

        fileSize: {
            type: Number,
            default: 0,
        },

        mimeType: {
            type: String,
            default: '',
        },

        messageType: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'document'],
            default: 'text',
        },

        // =====================================================
        // DIRECT MESSAGE STATUS
        // =====================================================

        isRead: {
            type: Boolean,
            default: false,
        },

        isDelivered: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // GROUP MESSAGE DELIVERY STATUS
        // =====================================================

        deliveryStatus: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },

                deliveredAt: {
                    type: Date,
                    default: null,
                },
            },
        ],

        // =====================================================
        // GROUP MESSAGE READ STATUS
        // =====================================================

        readStatus: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },

                readAt: {
                    type: Date,
                    default: null,
                },
            },
        ],

        // =====================================================
        // SELF-DESTRUCT
        // =====================================================

        expiresAt: {
            type: Date,
            default: null,
        },

        isSelfDestruct: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // SCHEDULED MESSAGE
        // =====================================================

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

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
