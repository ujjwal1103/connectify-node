// create a new chat
import Chat from "../models/chat.modal.js";
import User from "../models/user.modal.js";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import mongoose from "mongoose";
import Message from "../models/message.modal.js";
import { checkObjectId, emitEvent } from "../utils/index.js";
import { REFECTCH_CHATS, NEW_CHAT } from "../utils/constant.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
    isGroup: false, // Ensure this is a one-to-one chat
    "members.user": { $all: [userId, to] }, // Both users must be present
    members: { $size: 2 }, // Ensure the chat is only between two users
  })
    .populate({
      path: "members.user lastMessage",
      select: "name username _id avatar text from",
    })
    .lean();

  if (existingChat) {
    const friend = existingChat.members.find(
      (member) => member.user._id.toString() !== userId
    );
  
    return res.status(201).json({
      isSuccess: true,
      chat: { ...existingChat, friend: {...friend, ...friend.user}, new: false },
    });
  }

  const uniqueMembers = Array.from(new Set(members));

  if (uniqueMembers.length < 2) {
    throw new ApiError(400, "The chat must have at least two unique members.");
  }

  const newChat = new Chat({
    isGroup: false,
    members: [
      { user: userId, role: "member" },
      { user: to, role: "member" },
    ],
  });

  const savedChat = await newChat.save();

  // Fetch the saved chat with populated fields
  const chat = await Chat.findById(savedChat._id)
    .populate({
      path: "members.user lastMessage",
      select: "name username _id avatar text from",
    })
    .lean();

  const friend = chat.members.find(
    (member) => member.user._id.toString() !== userId
  );


  delete chat.members;

  emitEvent(req, NEW_CHAT, [friend._id], { ...chat, friend });

  return res.status(201).json({
    isSuccess: true,
    chat: { ...chat, friend: {...friend, ...friend.user} },
  });
});

export const createGroup = asyncHandler(async (req, res) => {
  const {
    user: { userId },
    body: { users, groupName },
  } = req;

  // Parse users from request body
  const allUsers = JSON.parse(users);
  const groupMembers = allUsers.map((user) => ({ user, role: "member" }));

  // Check for duplicate user (group creator in member list)
  if (allUsers.some((user) => user === userId)) {
    throw new ApiError(
      400,
      "The group members list cannot include the group creator."
    );
  }

  // Add group creator as admin
  const members = [{ user: userId, role: "admin" }, ...groupMembers];

  // Check for an existing group with the same members
  const existingChat = await Chat.findOne({
    isGroup: true, // Ensure it's a group chat
    "members.user": { $all: members.map((member) => member.user) }, // Match all users
    members: { $size: members.length }, // Ensure exact size
  })
    .populate({
      path: "members.user lastMessage",
      select: "name username _id avatar text from",
    })
    .lean();

  if (existingChat) {
    return res.status(201).json({
      isSuccess: true,
      isExisting: true,
      chat: existingChat,
    });
  }

  // Upload group avatar if provided
  let groupAvatar = null;
  if (req.file) {
    const resp = await uploadOnCloudinary(
      req.file.path,
      `${userId}/groupAvatars`,
      { gravity: "face", aspect_ratio: 1, crop: "fill", type: "instagram" }
    );

    groupAvatar = {
      url: resp.secure_url,
      publicId: resp.public_id,
    };

    if (!groupAvatar) {
      throw new ApiError(400, "Failed to upload group avatar.");
    }
  }

  // Create a new group chat
  const newChat = new Chat({
    members,
    isGroup: true,
    groupAvatar,
    groupName,
    createdBy: userId,
  });

  const savedChat = await newChat.save();

  // Fetch the newly created group chat with populated fields
  const chat = await Chat.findById(savedChat._id)
    .populate({
      path: "members.user lastMessage",
      select: "name username _id avatar text from",
    })
    .lean();

  // Emit event to notify users
  emitEvent(req, REFECTCH_CHATS, allUsers);

  return res.status(201).json({
    isSuccess: true,
    chat,
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const {
    user: {userId},
    params: { chatId },
    body: { name },
  } = req;

  const chat = await Chat.findById(chatId)

  if(!chat.isGroup) {
    throw new ApiError(404, "Invalid Action");
  }
  let groupAvatar=chat.groupAvatar;
  if (req.file) {
    const resp = await uploadOnCloudinary(
      req.file.path,
      `${userId}/groupAvatars`,
      { gravity: "face", aspect_ratio: 1, crop: "fill", type: "instagram" }
    );

    groupAvatar = {
      url: resp.secure_url,
      publicId: resp.public_id,
    };

    if (!groupAvatar)
      throw new ApiError(400, "Failed to upload profile pIcture");
  }

  const updatedGroup = await Chat.findByIdAndUpdate(
    chatId,
     {
      groupName: name,
      groupAvatar: groupAvatar
    },
    { new: true }
  );
  return res.status(201).json({
    isSuccess: true,
    chat:updatedGroup,
  });
});

export const getAllChats = async (req, res) => {
  const { userId } = req.user;
  const { search } = req.query;

  try {
    let pipeline = [
      {
        $match: {
          "members.user": new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members.user",
          foreignField: "_id",
          as: "membersInfo",
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
          from: "messages",
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
                  input: "$membersInfo",
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
        $lookup: {
          from: "messages",
          let: { chatId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chat", "$$chatId"] },
                    { $ne: ["$from", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$seen", false] },
                  ],
                },
              },
            },
            {
              $count: "unseenCount",
            },
          ],
          as: "unseenMessages",
        },
      },
      {
        $addFields: {
          unseenMessagesCount: {
            $ifNull: [{ $arrayElemAt: ["$unseenMessages.unseenCount", 0] }, 0],
          },
        },
      },
      {
        $match: {
          $or: [
            { "friend.username": { $regex: search || "", $options: "i" } },
            { "groupName": { $regex: search || "", $options: "i" } }
          ]
        }
      },
      {
        $project: {
          __v: 0,
          unseenMessages: 0,
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ];

    const aggregatedChats = await Chat.aggregate(pipeline); 
    const chats = aggregatedChats.map((chat)=>{
      return {
        ...chat,
        membersInfo: undefined,
        members: chat.members.map(member => ({
          ...member,
          ...chat.membersInfo.find(user => user._id.toString() === member.user.toString())
        }))
      }
    })



    return res.status(201).json({
      isSuccess: true,
      chats: chats,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const getChatById = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.user;

  if (!checkObjectId(chatId)) {
    throw new ApiError(404, "Chat not found");
  }

  let pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members.user",
        foreignField: "_id",
        as: "membersInfo",
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
        from: "messages",
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
                input: "$membersInfo",
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
        __v: 0,
      },
    },
  ];

  const aggregatedChats = await Chat.aggregate(pipeline);

  if (!aggregatedChats[0]) {
    throw new ApiError(400, "Chat not found");
  }

  const chats = aggregatedChats.map((chat)=>{
    return {
      ...chat,
      membersInfo: undefined,
      members: chat.members.map(member => ({
        ...member,
        ...chat.membersInfo.find(user => user._id.toString() === member.user.toString())
      }))
    }
  })


  return res.status(200).json({
    isSuccess: true,
    chat: chats[0],
  });
});


export const deleteChatById = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({ chat: chatId });
    const deletedChat = await Chat.findByIdAndDelete(chatId);

    if (!deletedChat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    const attachments = messages.flatMap(
      (message) => message.attachments || []
    );

    console.log(attachments);

    const deletedMessages = await Message.deleteMany({ chat: chatId });

    emitEvent(req, REFECTCH_CHATS, deletedChat.members);

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

export const chatUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const users = await User.aggregate([
    {
      $match: {
        _id: { $ne: new mongoose.Types.ObjectId(userId) }, // Use $ne to exclude the given userId
      },
    },
    {
      $project: {
        username: 1,
        _id: 1,
        name: 1,
        avatar: 1,
      },
    },
    {
      $lookup: {
        from: "chats",
        localField: "_id",
        foreignField: "members",
        as: "chat",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "followers",
        pipeline: [
          {
            $match: {
              followeeId: new mongoose.Types.ObjectId(userId),
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followeeId",
        as: "following",
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
      $match: {
        $or: [
          { $expr: { $gt: [{ $size: "$followers" }, 0] } }, // At least one follower
          { $expr: { $gt: [{ $size: "$following" }, 0] } }, // At least one following
        ],
      },
    },
    {
      $project: {
        username: 1,
        _id: 1,
        name: 1,
        avatar: 1,
      },
    },
  ]);

  return res.status(200).json({
    data: users,
    isSuccess: true,
  });
});

export const addGroupMembers = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { newMembers } = req.body; // Expecting an array of user IDs in the request body
  const { userId } = req.user;

  if (!checkObjectId(chatId)) {
    throw new ApiError(404, "Group not found");
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Group not found");
  }

  if (!chat.isGroup) {
    throw new ApiError(400, "This operation is only allowed for group chats");
  }

  // Check if the user is an admin
  const isAdmin = chat.members.some(
    (member) => member.user.toString() === userId && member.role === "admin"
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorized to add members to this group");
  }

  const uniqueNewMembers = Array.from(new Set(newMembers)); // Avoid duplicate IDs
  const existingMemberIds = chat.members.map((member) => member.user.toString());

  const membersToAdd = uniqueNewMembers.filter(
    (memberId) => !existingMemberIds.includes(memberId)
  );

  if (membersToAdd.length === 0) {
    return res.status(400).json({
      isSuccess: false,
      message: "All provided members are already in the group",
    });
  }

  const newMemberObjects = membersToAdd.map((memberId) => ({
    user: memberId,
    role: "member", // Default role for new members
  }));

  chat.members.push(...newMemberObjects);
  await chat.save();

  return res.status(200).json({
    isSuccess: true,
    message: "Members added successfully",
    chat,
  });
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { memberId } = req.body; // ID of the member to remove
  const { userId } = req.user;

  if (!checkObjectId(chatId) || !checkObjectId(memberId)) {
    throw new ApiError(404, "Invalid group or member ID");
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Group not found");
  }

  if (!chat.isGroup) {
    throw new ApiError(400, "This operation is only allowed for group chats");
  }

  // Check if the user is an admin
  const isAdmin = chat.members.some(
    (member) => member.user.toString() === userId && member.role === "admin"
  );

  if (!isAdmin) {
    throw new ApiError(403, "You are not authorized to remove members from this group");
  }

  const memberIndex = chat.members.findIndex(
    (member) => member.user.toString() === memberId
  );

  if (memberIndex === -1) {
    throw new ApiError(404, "The specified member is not in the group");
  }

  // Prevent removing the last admin
  if (chat.members[memberIndex].role === "admin") {
    const adminCount = chat.members.filter((member) => member.role === "admin").length;

    if (adminCount === 1) {
      throw new ApiError(400, "Cannot remove the only admin from the group");
    }
  }

  chat.members.splice(memberIndex, 1); // Remove the member
  await chat.save();

  return res.status(200).json({
    isSuccess: true,
    message: "Member removed successfully",
    chat,
  });
});



export const removeGroupAvatar = asyncHandler(async (req, res) => {
  const {
    user: { userId },
    params: { chatId },
  } = req;

  const chat = await Chat.findById(chatId);

  let groupAvatar = chat.groupAvatar;

  if (groupAvatar && groupAvatar.publicId) {
      await deleteFromCloudinary([groupAvatar.publicId]);
  }

  groupAvatar = null;

  const updatedGroup = await Chat.findByIdAndUpdate(
    chatId,
    {
      groupAvatar: groupAvatar,
    },
    { new: true }
  );

  return res.status(201).json({
    isSuccess: true,
    chat: updatedGroup,
  });
});


