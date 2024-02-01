import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    likedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assuming a User model
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // Assuming a User model
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" }, // Assuming a User model
  },
  { timestamps: true }
);

const Like = mongoose.model("Like", likeSchema);

export default Like;
