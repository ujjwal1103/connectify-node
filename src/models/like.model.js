import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assuming a User model
  targetType: { type: String, enum: ["Post", "Comment"] }, // Type of the target: Post or Comment
  targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the liked Post or Comment
  createdAt: { type: Date, default: Date.now },
});

const Like = mongoose.model("Like", likeSchema);

export default Like;
