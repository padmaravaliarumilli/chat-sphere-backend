const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    profilePic: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
     theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },

    preferredLanguage: {
      type: String,
      enum:["english", "telugu","hindi"],
      default: "english",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;