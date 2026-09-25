const mongoose = require("mongoose");

const pollOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    votes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    options: {
      type: [pollOptionSchema],
      required: true,
      validate: {
        validator: function (options) {
          return options.length >= 2 && options.length <= 10;
        },
        message: "A poll must have between 2 and 10 options.",
      },
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    voters: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        option: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
      },
    ],

    isClosed: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pollSchema.index({ conversation: 1, createdAt: -1 });

module.exports =
    mongoose.models.Poll ||
    mongoose.model("Poll", pollSchema);