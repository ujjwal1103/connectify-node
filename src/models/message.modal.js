import mongoose from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
    },
    messageType: {
      type: String,
      default: "TEXT_MESSAGE",
      enum: [
        "TEXT_MESSAGE",
        "AUDIO",
        "IMAGE",
        "VIDEO",
        "VOICE_MESSAGE",
        "POST_MESSAGE",
        "GROUP_CREATED"
      ],
    },
    attachments: {
      type: [String],
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    reaction: String
  },
  { timestamps: true }
);

messageSchema.plugin(mongooseAggregatePaginate);

const Message = mongoose.model("Message", messageSchema);

export default Message;
