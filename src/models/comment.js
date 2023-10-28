// mongoose Comment model

import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
     //person ho commented on post
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true
        },
        comment: {
            type: String,
            required: true,
        },
        repliedComments:  [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Comment",
            },
        ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
