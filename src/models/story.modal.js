import { ref } from "firebase/storage";
import mongoose from "mongoose";

// Define the Story schema
const storySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    viewedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
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
