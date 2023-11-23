import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: Number,
    },
    password: {
      type: String,
      required: true,
    },

    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    profilePicture: {
      type: String,
    },
    coverPhoto: {
      type: String,
    },
    bio: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    sentfriendRequest: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    receivedfriendRequest: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    name: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
