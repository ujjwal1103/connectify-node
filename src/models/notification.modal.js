// mongoose notification model

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "LIKE_POST",
      required: true,
      enum: [
        "LIKE_POST",
        "FOLLOW_RESQUEST_SENT",
        "FOLLOW_REQUEST_ACCEPTED",
        "FOLLOWING",
        "COMMENT_POST"
      ],
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FollowRequest",
    },
    followId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Follow",
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;

// {
//   type: "POST_LIKE",
//   postId: "2839820482742847387482738472",
//   actionBy: "username",
//   text: "ujjwal_lade liked your post",
//   actionByUrl:
//     "https://firebasestorage.googleapis.com/v0/b/connectify-29152.appspot.com/o/posts%2Fimage.png?alt=media&amp;token=20351c46-4db1-44bb-b8bb-f3c6a5b8ffee",
//   postImageUrl:
//     "https://firebasestorage.googleapis.com/v0/b/connectify-29152.appspot.com/o/posts%2Fimage.png?alt=media&amp;token=20351c46-4db1-44bb-b8bb-f3c6a5b8ffee",
// },
