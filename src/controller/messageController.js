import mongoose from "mongoose";
import Chat from "../models/chat.modal.js";
import Message from "../models/message.modal.js";
import { emitEvent } from "../utils/index.js";
import { NEW_MESSAGE, SEEN_MESSAGES } from "../utils/constant.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadMultipleOnCloudinary } from "../utils/cloudinary.js";
import User from "../models/user.modal.js";
import { Follow } from "../models/follow.model.js";

export const sendMessage = async (req, res) => {
  const { userId: from } = req.user;
  const { chat } = req.params;
  const { text, messageType, to, post = null } = req.body;

  console.log(text, messageType, to);
  if (!text) throw new ApiError(404, "Empty message");
  try {
    const existingChat = await Chat.findById(chat);

    if (!existingChat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    // Check if the user sending the message is a participant in the chat
    if (!existingChat.members.includes(from)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

    console.log(existingChat);

    // Create a new message
    const newMessage = new Message({
      from,
      text,
      messageType,
      to,
      chat,
      post,
    });

    // Update the "lastMessage" field in the chat
    existingChat.lastMessage = newMessage;
    await existingChat.save();

    const message = await newMessage.save();

    // add this message as last message in the chat model
    await Chat.findByIdAndUpdate(
      { _id: chat },
      { lastMessage: message._id },
      { new: true }
    );

    emitEvent(req, NEW_MESSAGE, [from, to], {
      to,
      chat,
      from,
      message,
    });

    return res.status(200).json({
      isSuccess: true,
      chat: chat,
      message: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};
export const sendMessageToUsers = asyncHandler(async (req, res) => {
  const { userId: from } = req.user;

  const { post, userId, messageType } = req.body;
  let chat = null;
  chat = await Chat.findOne({
    members: { $all: [userId, from] },
  });

  if (!chat) {
    const members = [from, userId];
    const toUser = await User.findById(from);

    if (!toUser) {
      throw new ApiError(400, `The ${from} user does not exist`);
    }

    if (from === userId) {
      throw new ApiError(
        400,
        "The 'to' array cannot contain the same user as the 'from' user."
      );
    }

    const newChat = new Chat({
      members: members,
    });

    chat = await newChat.save();
  }

  // Create a new message
  const newMessage = new Message({
    from,
    chat: chat?._id,
    post,
    text: "",
    messageType: messageType,
    to: userId,
  });

  const message = await newMessage.save();

  await Chat.findByIdAndUpdate(
    { _id: chat?._id },
    { lastMessage: message._id },
    { new: true }
  );

  const mm = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "post",
        foreignField: "_id",
        as: "post",
        pipeline: [
          {
            $project: {
              _id: 1,
              userId: 1,
              imageUrl: 1,
              caption: 1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              user: {
                $first: "$user",
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        post: {
          $first: "$post",
        },
      },
    },
    {
      $addFields: {
        username: "$post.user.username",
        name: "$post.user.name",
        userId: "$post.user._id",
        postImages: "$post.imageUrl",
        caption: "$post.caption",
        postId: "$post._id",
        avatar: "$post.user.avatar",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "userId",
        foreignField: "followeeId",
        as: "follow",
        pipeline: [
          {
            $match: {
              followerId: new mongoose.Types.ObjectId(userId),
            },
          },
        ],
      },
    },
    {
      $project: {
        post: 0,
      },
    },
  ]);

  const follow = await Follow.findOne({
    followerId: mm[0].userId,
    followeeId: userId,
  });

  emitEvent(req, NEW_MESSAGE, [mm[0]?.from, mm[0].to], {
    to: userId,
    chat: chat?._id,
    from,
    message: { ...mm[0], isUnavailable: !!follow },
  });

  return res.status(200).json({
    isSuccess: true,
    chat: chat,
    message: newMessage,
  });
});

export const sendAttachments = async (req, res) => {
  const { userId: from } = req.user;
  const { chat } = req.params;
  const { messageType, to } = req.body;

  try {
    const existingChat = await Chat.findById(chat);

    if (!existingChat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    // Check if the user sending the message is a participant in the chat
    if (!existingChat.members.includes(from)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

    if (!req.files.length) {
      throw new ApiError(404, "Files is required");
    }

    const filePaths = req.files.map((f) => f.path);

    const attachmentsUrl = await uploadMultipleOnCloudinary(
      filePaths,
      `${from}/messagesAttachments`
    );

    if (!attachmentsUrl || attachmentsUrl.length === 0) {
      throw new ApiError(404, "Files are required");
    }

    // Create a new message
    const newMessage = new Message({
      from,
      text: "",
      messageType,
      attachments: attachmentsUrl.map((im) => im.url),
      to,
      chat,
    });

    // Update the "lastMessage" field in the chat
    existingChat.lastMessage = newMessage;
    await existingChat.save();

    const message = newMessage.save();

    // add this message as last message in the chat model
    await Chat.findByIdAndUpdate(
      { _id: chat },
      { lastMessage: message._id },
      { new: true }
    );

    return res.status(200).json({
      isSuccess: true,
      chatId: chat,
      message: newMessage,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const getMessagesInChat = async (req, res) => {
  const { chat } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const { userId } = req.user;
  try {
    const skip = (page - 1) * pageSize;

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chat),
          seen: false,
          from: { $ne: new mongoose.Types.ObjectId(userId) },
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
    ]);

    const idsOnly = unreadMessages.map((messages) => messages._id);

    if (idsOnly) {
      await Message.updateMany(
        {
          _id: { $in: idsOnly },
        },
        {
          $set: {
            seen: true,
          },
        }
      );
    }

    const totalCount = await Message.countDocuments({ chat });
    const totalPages = Math.ceil(totalCount / pageSize);

    console.log(idsOnly);

    const mm = await Message.aggregate([
      {
        $match: {
          chat: new mongoose.Types.ObjectId(chat),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: parseInt(pageSize),
      },
      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          as: "post",
          pipeline: [
            {
              $project: {
                _id: 1,
                userId: 1,
                imageUrl: 1,
                caption: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                user: {
                  $first: "$user",
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          post: {
            $first: "$post",
          },
        },
      },
      {
        $addFields: {
          username: "$post.user.username",
          name: "$post.user.name",
          userId: "$post.user._id", // post owner
          postImages: "$post.imageUrl",
          caption: "$post.caption",
          postId: "$post._id",
          avatar: "$post.user.avatar",
        },
      },
      //   {
      //     $lookup: {
      //       from: "follows",
      //       localField: "userId",
      //       foreignField: "followeeId",
      //       as: "follow",
      //       pipeline: [
      //         {
      //           $match: {
      //             followerId: new mongoose.Types.ObjectId(userId),
      //           },
      //         },
      //       ],
      //     },
      //   },
      //   {
      //     $addFields: {
      //         isUnavailable: {
      //             $cond: [
      //                 {
      //                     $gt: [
      //                         {
      //                             $size: "$follow",
      //                         },
      //                         0,
      //                     ],
      //                 },
      //                 true,
      //                 false,
      //             ],
      //         },
      //     },
      // },
      {
        $project: {
          post: 0,
          // follow:0,
        },
      },
    ]);

    if (Number(page) === 1 && idsOnly?.length > 0) {
      emitEvent(req, SEEN_MESSAGES, [mm[0]?.from, mm[0].to], {
        chat,
        idsOnly,
      });
    }

    return res.status(200).json({
      isSuccess: true,
      messages: mm.reverse(),
      hasMore: mm.length > 0,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        isSuccess: false,
      });
    }
    // Check authorization here to ensure the user can delete the message
    await message.remove();
    return res.status(200).json({
      isSuccess: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const markAllMessagesAsSeen = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.user;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.members.includes(userId)) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  const messages = await Message.updateMany(
    { chat: chatId, to: userId },
    { isSeen: true }
  );

  return res.status(200).json({
    isSuccess: true,
    messages: messages,
  });
});

export const deleteMultipleMessage = asyncHandler(async (req, res) => {
  const messageIds = req.body;

  const deletedMessages = await Message.deleteMany({
    _id: { $in: messageIds },
  });

  return res.status(200).json({
    isSuccess: true,
    messages: messageIds,
    deletedMessages,
  });
});

export const markMessageAsSeen = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findByIdAndUpdate(messageId, { seen: true });

  return res.status(200).json({
    isSuccess: true,
    message,
  });
});
