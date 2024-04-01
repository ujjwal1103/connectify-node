import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    default: "TEXT_MESSAGE",
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
  },
  seen: {
    type: Boolean,
    default:false
  }
},{timestamps: true});

const Message = mongoose.model("Message", messageSchema);

export default Message;
