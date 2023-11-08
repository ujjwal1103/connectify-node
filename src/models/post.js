import mongoose from "mongoose";
import { urlValidator } from "../utils/index.js";
const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true,
    },
    hashtags: {
      type: [String],
      trim: true,
      lowercase: true,
    },
    imageUrl: {
      type: String,
      required: true,
      validate: {
        validator: urlValidator,
        message: "Invalid URL format",
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
