// create a new chat
import Chat from "../models/chat.modal.js";
import User from "../models/user.modal.js";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";

export const createChat = asyncHandler(async (req, res) => {
  const {
    user: { userId },
    body: { to },
  } = req;
  const members = [userId, to];
  const toUser = await User.findById(to);
  if (!toUser) {
    throw new ApiError(400, `The ${to} user does not exist`);
  }

  if (to === userId) {
    throw new ApiError(
      400,
      "The 'to' array cannot contain the same user as the 'from' user."
    );
  }

  const existingChat = await Chat.findOne({
    members: {
      $all: members,
    },
  })
    .populate({
      path: "members lastMessage",
      select: "name username _id profilePicture text from",
    })
    .lean();

  if (existingChat) {
    const friend = existingChat.members.find(
      (member) => member._id.toString() !== userId
    );
    return res.status(201).json({
      isSuccess: true,
      chat: { ...existingChat, friend: friend },
    });
  }

  //5497433 ticket
  const uniqueMembers = Array.from(new Set(members));

  if (uniqueMembers.length < 2) {
    throw new ApiError(400, "The chat must have at least two unique members.");
  }
  const newChat = new Chat({
    members: uniqueMembers,
  });

  const savedChat = await newChat.save();

  const chat = await Chat.findById(savedChat._id)
    .populate({
      path: "members lastMessage",
      select: "name username _id profilePicture text from",
    })
    .lean();
  const friend = await chat.members.find(
    (member) => member._id.toString() !== userId
  );
  delete chat.members;
  return res.status(201).json({
    isSuccess: true,
    chat: { ...chat, friend: friend },
  });
});

export const getAllChats = async (req, res) => {
  const { userId } = req.user;
  try {
    const chats = await Chat.find({ members: { $in: [userId] } })
      .populate({
        path: "members lastMessage",
        select: "name username _id profilePicture text from",
      })
      .select("-__v")
      .sort({ updatedAt: -1 })
      .lean();

    const modifiedChats = chats.map((chat) => {
      // Find the friend who is not the current user
      const { members, ...other } = chat;
      const friend = members.find((member) => member._id.toString() !== userId);

      // Create a new chat object with the additional "friend" field
      const modifiedChat = {
        ...other, // Convert the Mongoose document to a plain JavaScript object
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
