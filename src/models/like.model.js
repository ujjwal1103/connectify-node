import mongoose from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new mongoose.Schema(
  {
    likedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assuming a User model
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // Assuming a User model
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" }, // Assuming a User model
  },
  { timestamps: true }
);

likeSchema.plugin(mongooseAggregatePaginate);

const Like = mongoose.model("Like", likeSchema);

export default Like;
