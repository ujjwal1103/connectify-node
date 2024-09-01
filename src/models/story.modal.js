import mongoose from "mongoose";
import { imageSchema } from "./chat.modal.js";

// Define the Story schema
const storySchema = new mongoose.Schema(
  {
    content: {
      type: imageSchema,
      required: true,
    },
    viewedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    storyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expireDate: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000, // 24 hours from creation
      index: { expires: '1s' }, // Expire after 1 second once the expireDate is reached
    },
  },
  { timestamps: true }
);

// Create the Story model
const Story = mongoose.model("Story", storySchema);

export default Story;

const userStoriesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  stories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
  ],  
});

export const UserStories = mongoose.model("UserStrories", userStoriesSchema);
