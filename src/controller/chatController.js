// create a new chat

import Chat from "../models/chat.js";
import User from "../models/userModal.js";

export const createChat = async (req, res) => {
  const { userId } = req.user;
  console.log(userId);
  const { to } = req.body;

  const members = [userId, to];
  try {
    const toUser = await User.findById(to);

    if (!toUser) {
      return res.status(404).json({
        error: "The 'to' user does not exist.",
        isSuccess: false,
      });
    }

    if (to === userId) {
      return res.status(400).json({
        error:
          "The 'to' array cannot contain the same user as the 'from' user.",
        isSuccess: false,
      });
    }

    const existingChat = await Chat.findOne({
      members: {
        $all: members,
      },
    });

    if (existingChat) {
      return res.status(400).json({
        error: "Chat with these members already exists",
        isSuccess: false,
      });
    }
    const uniqueMembers = Array.from(new Set(members));

    if (uniqueMembers.length < 2) {
      return res.status(400).json({
        error: "The chat must have at least two unique members.",
        isSuccess: false,
      });
    }
    const newChat = new Chat({
      members: uniqueMembers,
    });

    // Save the new chat to the database
    const savedChat = await newChat.save();

    return res.status(201).json({
      isSuccess: true,
      chat: savedChat,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const getAllChats = async (req, res) => {
  const { userId } = req.user;
  try {
    const chats = await Chat.find({ members: { $in: [userId] } }).populate({
      path: "members lastMessage",
      select: "name username _id profilePicture text from",
    }).sort({ updatedAt: -1 });
    
    console.log(chats)
    const modifiedChats = chats.map((chat) => {
      // Find the friend who is not the current user
      const friend = chat.members.find(
        (member) => member._id.toString() !== userId
      );

      // Create a new chat object with the additional "friend" field
      const modifiedChat = {
        ...chat.toObject(), // Convert the Mongoose document to a plain JavaScript object
        friend: friend,
      };

      return modifiedChat;
    });

    return res.status(201).json({
      isSuccess: true,
      chats: modifiedChats,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const getChatById = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    return res.status(200).json({
      isSuccess: true,
      chat: chat,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};

export const deleteChatById = async (req, res) => {
  const { chatId } = req.params;
  try {
    const deletedChat = await Chat.findByIdAndDelete(chatId);

    if (!deletedChat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Chat deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};
