import mongoose from "mongoose";
import Chat from "../models/chat.modal.js";
import Message from "../models/message.modal.js";
import { emitEvent, getMongoosePaginationOptions } from "../utils/index.js";
import { SEEN_MESSAGES } from "../utils/constant.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadMultipleOnCloudinary } from "../utils/cloudinary.js";
import User from "../models/user.modal.js";
import { Follow } from "../models/follow.model.js";

const getMessageAggregate = (chat) => {
  return [
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
      $lookup: {
        from: "users",
        localField: "from",
        foreignField: "_id",
        as: "sender",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],

      }
    }
    ,
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
              images: 1,
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
                  $limit: 1
                },
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
        sender: {
          $first: "$sender",
        },
      },
    },
  ]
}

export const sendMessage = async (req, res) => {
  const { userId: from } = req.user;
  const { chat } = req.params;
  const { text, messageType, to, post = null } = req.body;

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
    const members = existingChat.members.map(m => m.user.toString())

    if (!members.includes(from)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

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

    await newMessage.save();

    const messageAggregate = await Message.aggregate(getMessageAggregate(chat));

    const message = messageAggregate[0]

    await Chat.findByIdAndUpdate(
      { _id: chat },
      { lastMessage: message._id },
      { new: true }
    );

    const event = `chat:${chat}:message`

    emitEvent(req, event, [...existingChat.members.filter(mem => mem.user.toString() !== from)], {
      to,
      chat,
      from,
      message,
    });


    return res.status(200).json({
      isSuccess: true,
      chat,
      message
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const createSystemMessage = async (chatId, from, to, text, members, systemMessageType,req) => {
  try {
    const newMessage = new Message({
      from,
      text,
      messageType: 'SYSTEM',
      to,
      chat: chatId,
      systemMessageType
    });

    await newMessage.save();

    const event = `chat:${chatId}:message`

    emitEvent(req, event,members.map(m=>m.user), {
      to,
      chat: chatId,
      from,
      message: newMessage,
    });

    return newMessage;
  } catch (error) {
    throw error;
  }
}

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
        "Invalid Action "
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

  const event = `chat:${chat}:message`

  emitEvent(req, event, [mm[0]?.from, mm[0].to], {
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
    const members = existingChat.members.map(m => m.user.toString())
    console.log(members);

    if (!members.includes(from)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

    if (!req.files.length) {
      throw new ApiError(404, "Files is required");
    }

    const files = req.files.map((f) => ({
      path: f.path,
      isVideo: f.mimetype.includes("video"),
    }));

    const attachmentsUrl = await uploadMultipleOnCloudinary(
      files,
      `${from}/messagesAttachments`
    );

    if (
      !attachmentsUrl ||
      !attachmentsUrl[0].url ||
      attachmentsUrl.length === 0
    ) {
      throw new ApiError(404, "Files are required");
    }

    const newMessage = new Message({
      from,
      text: "",
      messageType,
      attachments: attachmentsUrl.map((im) => im.url),
      to,
      chat,
    });
    existingChat.lastMessage = newMessage;
    await existingChat.save();

    await newMessage.save();

    const messageAggregate = await Message.aggregate(getMessageAggregate(chat));
    const message = messageAggregate[0]

    await Chat.findByIdAndUpdate(
      { _id: chat },
      { lastMessage: message._id },
      { new: true }
    );

    const event = `chat:${chat}:message`

    emitEvent(req, event, [...existingChat.members.filter(mem => mem.user.toString() !== from)], {
      to,
      chat,
      from,
      message,
    });

    return res.status(200).json({
      isSuccess: true,
      chatId: chat,
      message: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const getMessagesInChat =asyncHandler( async (req, res) => {
  const { chat } = req.params;
  const { page = 1, limit = 25 } = req.query;
  const { userId } = req.user;

    const existingChat = await Chat.findById(chat);
    if(!existingChat){
      throw new ApiError(404,"CHAT_NOT_FOUND");
    }
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

    const messageAggregate = Message.aggregate([
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
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "sender",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                avatar: 1,
              },
            },
          ],

        }
      }
      ,
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
                images: 1,
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
                    $limit: 1
                  },
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
          sender: {
            $first: "$sender",
          },
          isCurrentUserMessage: {
            $eq: ["$from", new mongoose.Types.ObjectId(userId)],
          },
        },
      },
    ]);

    const paginatedPosts = await Message.aggregatePaginate(
      messageAggregate,
      getMongoosePaginationOptions({
        limit: limit,
        page: page,
        customLabels: { docs: "messages" },
      })
    );

    if (Number(page) === 1 && idsOnly?.length > 0) {
      emitEvent(
        req,
        SEEN_MESSAGES,
        [paginatedPosts.messages[0]?.from, paginatedPosts.messages[0]?.to],
        {
          chat,
        }
      );
    }

    return res.status(200).json({
      isSuccess: true,
      ...paginatedPosts,
      idsOnly
    });
});

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        isSuccess: false,
      });
    }

    return res.status(200).json({
      isSuccess: true,
      message: "Message deleted successfully",
      mess: message
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

export const reactMessage = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { messageId } = req.params;
  const { react } = req.query;

  const message = await Message.findByIdAndUpdate(messageId, { reaction: react }, { new: true })

  return res.status(200).json({
    isSuccess: true,
    message
  });
})



