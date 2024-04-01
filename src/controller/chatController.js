// create a new chat
import Chat from "../models/chat.modal.js";
import User from "../models/user.modal.js";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import mongoose from "mongoose";
import Message from "../models/message.modal.js";
import { emitEvent } from "../utils/index.js";
import { REFECTCH_CHATS } from "../utils/constant.js";

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
      select: "name username _id avatar text from",
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
      select: "name username _id avatar text from",
    })
    .lean();
  const friend = await chat.members.find(
    (member) => member._id.toString() !== userId
  );



  delete chat.members;

  emitEvent(req, REFECTCH_CHATS, [friend._id] )

  return res.status(201).json({
    isSuccess: true,
    chat: { ...chat, friend: friend },
  });
});

export const getAllChats = async (req, res) => {
  const { userId } = req.user;
  try {
    const aggrigatedChats = await Chat.aggregate([
      {
        $match: {
          members: { $in: [new mongoose.Types.ObjectId(userId)] },
        },
      },
      {
        $lookup: {
          from: "users", // Assuming "users" is the collection for user details
          localField: "members",
          foreignField: "_id",
          as: "members",
          pipeline: [
            {
              $project: {
                username: 1,
                name: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "messages", // Assuming "users" is the collection for user details
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
          pipeline: [
            {
              $project: {
                chat: 0,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          friend: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$members",
                  cond: {
                    $ne: ["$$this._id", new mongoose.Types.ObjectId(userId)],
                  },
                },
              },
              0,
            ],
          },
          lastMessage: {
            $first: "$lastMessage",
          },
        },
      },
      {
        $project: {
          members: 0,
          __v: 0, // Remove the membersDetails field after adding the friend field
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ]);

    return res.status(201).json({
      isSuccess: true,
      chats: aggrigatedChats,
    });
  } catch (error) {
    console.log(error);
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
    const deletedMessages = await Message.deleteMany({ chat: chatId });


    emitEvent(req, REFECTCH_CHATS, deletedChat.members )



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
