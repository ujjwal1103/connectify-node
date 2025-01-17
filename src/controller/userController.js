import axios from "axios";
import User from "../models/user.modal.js";
import bcrypt from "bcryptjs";
import QueryString from "qs";
import asyncHandler, {
  handleSuccessResponse,
} from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import mongoose from "mongoose";
import { users } from "../userdata.js";
import Post from "../models/post.modal.js";
import { Follow } from "../models/follow.model.js";
import { getMongoosePaginationOptions, getObjectId } from "../utils/index.js";

import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { USERID_NOT_FOUND, UserLoginType } from "../constants/index.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.modal.js";
import { FollowRequest } from "../models/followRequest.modal.js";
import Message from "../models/message.modal.js";
import Chat from "../models/chat.modal.js";
import {
  findUserByProperty,
  findUserByUsername,
  generateAccessAndRefreshTokens,
  getMutualFriends,
} from "../helpers/user.js";

const options = {
  httpOnly: true,
  secure: true,
};


const getUserAggregation = (filter, additionalFields = {}) => {
  return [
    {
      $match: filter
    },
    {
      $project: {
        username: 1,
        name: 1,
        email: 1,
        isPrivate: 1,
        avatar: 1,
        bio: 1,
        gender: 1,
        ...additionalFields,
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followeeId",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "following",
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "userId",
        as: "posts",
      },
    },
    {
      $addFields: {
        followers: {
          $size: "$followers",
        },
        following: {
          $size: "$following",
        },
        posts: {
          $size: "$posts",
        },
      },
    },
  ];
};

const getUserByUsernameAggregation = (filter, userId) => {
  const Id = getObjectId(userId);

  return [
    {
      $match: filter
    },
    {
      $project: {
        username: 1,
        name: 1,
        isPrivate: 1,
        avatar: 1,
        bio: 1,
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followeeId",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "following",
      },
    },
    {
      $lookup: {
        from: "followrequests",
        localField: "_id",
        foreignField: "requestedTo",
        as: "isRequested",
        pipeline: [
          {
            $match: {
              requestedBy: Id,
              requestStatus: "PENDING",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "followrequests",
        localField: "_id",
        foreignField: "requestedBy",
        as: "isRequesting",
        pipeline: [
          {
            $match: {
              requestedTo: Id,
              requestStatus: "PENDING",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "userId",
        as: "posts",
      },
    },
    {
      $addFields: {
        followers: {
          $size: "$followers",
        },
        following: {
          $size: "$following",
        },
        posts: {
          $size: "$posts",
        },
        isFollow: {
          $in: [Id, "$followers.followerId"],
        },
        isIFollow: {
          $in: [Id, "$following.followeeId"],
        },
        isRequested: {
          $in: [Id, "$isRequested.requestedBy"],
        },
        isRequesting: {
          $first: "$isRequesting",
        },
      },
    },
  ];
};

export const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email, name, verified_email } = req.body;
  const { provider } = req.query

  if (provider === 'GOOGLE') {
    if (
      [username, email, name].some(
        (feild) => !feild || feild.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ApiError(
        409,
        `Username unavailable please enter different username`
      );
    }

    await User.create({
      loginType: UserLoginType.GOOGLE,
      email,
      name,
      username: username.toLowerCase(),
      isEmailVerified: verified_email
    });

    const user = await User.findOne({ username: username?.toLowerCase() })
      .select("username email name")
      .lean();

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?._id
    );

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        user,
        isSuccess: true,
        message: `Welcome To connectify : ${user.username}`,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });

  } else {

    if (
      [username, password, email, name].some(
        (feild) => !feild || feild.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ApiError(
        409,
        `Username unavailable please enter different username`
      );
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    await User.create({
      email,
      password: hash,
      name,
      username: username.toLowerCase(),
    });

    const user = await User.findOne({ username: username?.toLowerCase() })
      .select("username email name")
      .lean();

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?._id
    );

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        user,
        isSuccess: true,
        message: `Welcome To connectify : ${user.username}`,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
  }




});

export const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;


  if (!username && !password) {
    throw new ApiError(400, `Please enter username and password`);
  }

  const user = await User.findOne({ username })
    .select("username email name password avatar")
    .lean();
  if (!user) {
    throw new ApiError(404, `Please enter valid username and password`);
  }
  const matchPassword = await bcrypt.compare(password, user.password);
  if (!matchPassword) {
    throw new ApiError(404, "`Please enter valid username and password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user?._id
  );
  delete user.password;
  delete user?.refreshToken;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: { ...user },
      isSuccess: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
});

export const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { username, name, email, id } = req.query;

  // Determine the filter
  let filter = {};
  if (username) {
    filter.username = username;
  } else if (name) {
    filter.name = name;
  } else if (email) {
    filter.email = email;
  } else if (id) {
    filter._id = getObjectId(id);
  } else {
    filter._id = getObjectId(userId);
  }

  const user = await User.aggregate(getUserAggregation(filter));

  if (!user[0]) {
    throw new ApiError(404, "User does not exits");
  }
  return handleSuccessResponse(res, { user: user[0] });
});

export const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { userId } = req.user;

  const user = await User.aggregate(
    getUserByUsernameAggregation({ username }, userId)
  );

  const mutualFriends = await getMutualFriends(user[0]._id, userId);

  if (!user[0]) {
    throw new ApiError(404, USERID_NOT_FOUND);
  }
  return handleSuccessResponse(res, { user: user[0], mutualFriends });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;

  const usersAggregate = User.aggregate([
    {
      $match: {
        _id: { $ne: new mongoose.Types.ObjectId(userId) },
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followeeId",
        as: "followers",
        pipeline: [
          {
            $match: {
              followerId: {
                $not: {
                  $elemMatch: { followerId: new mongoose.Types.ObjectId(userId) },
                },
              },
            },
          }
        ]
      },
    },
    {
      $lookup: {
        from: "followrequests",
        localField: "_id",
        foreignField: "requestedTo",
        as: "isRequested",
        pipeline: [
          {
            $match: {
              requestedBy: new mongoose.Types.ObjectId(userId),
              requestStatus: "PENDING",
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isRequested: {
          $in: [
            new mongoose.Types.ObjectId(userId),
            "$isRequested.requestedBy",
          ],
        },
      },
    },
    {
      $match: {
        isRequested: false,
      },
    },
  ]);

  const usersPagination = await User.aggregatePaginate(
    usersAggregate,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "users" },
    })
  );

  return handleSuccessResponse(res, { ...usersPagination });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let { query, limit } = req.query;
  limit = parseInt(limit) || 20;

  if (query === undefined) {
    throw new ApiError(400, "query param is missing");
  }

  if (query === "") {
    return res.status(200).json({
      users: [],
      isSuccess: true,
      notFound: false,
    });
  }

  const Id = getObjectId(userId);
  const users = await User.aggregate([
    {
      $match: {
        _id: { $ne: userId },
        $or: [
          { name: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followeeId",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "followerId",
        as: "following",
      },
    },
    {
      $lookup: {
        from: "followrequests",
        localField: "_id",
        foreignField: "requestedTo",
        as: "isRequested",
        pipeline: [
          {
            $match: {
              requestedBy: Id,
              requestStatus: "PENDING",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "followrequests",
        localField: "_id",
        foreignField: "requestedBy",
        as: "isRequesting",
        pipeline: [
          {
            $match: {
              requestedTo: Id,
              requestStatus: "PENDING",
            },
          },
        ],
      },
    },

    {
      $addFields: {
        isFollow: {
          $in: [Id, "$followers.followerId"],
        },
        isIFollow: {
          $in: [Id, "$following.followeeId"],
        },
        isRequested: {
          $in: [Id, "$isRequested.requestedBy"],
        },
        isRequesting: {
          $first: "$isRequesting",
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        name: 1,
        avatar: 1,
        isRequested: 1,
        isRequesting: 1,
        isFollow: 1,
        isIFollow: 1,
      },
    },
    { $limit: limit },
  ]);

  return res.status(200).json({
    users: users,
    isSuccess: true,
    notFound: users.length === 0,
  });
});

export const getFriends = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, pageSize = 10 } = req.query;
  const skip = (page - 1) * pageSize;
  const currentUser = await User.findOne({ _id: userId });

  const followingList = currentUser?.following;
  const followersList = currentUser?.followers;

  const connectedUsers = [...followingList, ...followersList, userId];

  const users = await User.find({
    _id: { $ne: userId, $in: connectedUsers },
  })
    .skip(skip)
    .limit(Number(pageSize))
    .select("-password -__v");

  const totalRecords = await User.countDocuments({
    _id: { $ne: userId, $in: connectedUsers },
  });

  return res.status(200).json({
    users: users,
    isSuccess: true,
    totalRecords,
    pageSize: Number(pageSize),
    currentPage: Number(page),
    totalPages: Math.ceil(totalRecords / pageSize),
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await User.findOne({ _id: userId });
  if (!user) {
    throw new ApiError(404, "User Not Found");
  }
  const deletedUser = await User.deleteOne({ _id: userId });
  return res.status(200).json({
    result: deletedUser,
    isSuccess: true,
    message: "User deleted successfully",
  });
});

export const editUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { username, bio, name, gender } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  if (user) {
    await User.findByIdAndUpdate(
      userId,
      {
        username,
        bio,
        name,
        gender,
      },
      { new: true }
    );

    return res.status(200).json({
      isSuccess: true,
      updatedData: { username, bio, name, gender },
      message: "User updated successfully",
    });
  }
});

export const updateProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  if (!req.file) throw new ApiError(400, "Profile Picture is Missing");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, "User not found");

  const resp = await uploadOnCloudinary(
    req.file.path,
    `${user?._id}/profilePictures`,
    { gravity: "face", aspect_ratio: 1, crop: "fill", type: "instagram" }
  );

  const avatar = {
    url: resp.secure_url,
    publicId: resp.public_id,
  };

  if (!avatar) throw new ApiError(400, "Failed to upload profile pIcture");

  await User.findByIdAndUpdate(
    userId,
    {
      avatar,
    },
    { new: true }
  );

  if (user?.avatar?.publicId) {
    await deleteFromCloudinary([user.avatar.publicId]);
  }

  return res.status(200).json({ success: true, avatar });
});

export const removeProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, "User not found");

  if (user?.avatar?.publicId) {
    await deleteFromCloudinary([user.avatar.publicId]);
  }

  await User.findByIdAndUpdate(
    userId,
    {
      avatar: null,
    },
    { new: true }
  );

  return res.status(200).json({ isSuccess: true });
});

const getGoogleAuthToken = async (code) => {
  const url = "https://oauth2.googleapis.com/token";

  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECREAT,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  };

  try {
    const res = await axios.post(url, QueryString.stringify(values), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return res.data;
  } catch (error) {
    console.log("getTokenError", error.message);
  }
};

export const googleAuthentication = asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    throw new ApiError(404, "Invalide Authentication");
  }
  return res.redirect(process.env.REACT_REDIRECT_URI + code);
});

export async function getGoogleUser({ id_token, access_token }) {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );

    return res.data;
  } catch (error) {
    console.log(error, "Error fetching Google user");
    throw new Error(error.message);
  }
}

export const googleAuthenticate = asyncHandler(async (req, res) => {
  const { code } = req.query;

  const { id_token, access_token } = await getGoogleAuthToken(code);

  const googleUser = await getGoogleUser({ id_token, access_token });

  if (!googleUser.verified_email) {
    return res.status(403).send("Google account is not verified");
  }

  const existingUser = await User.findOne({ email: googleUser.email }).select("username email name password avatar").lean();

  if (existingUser) {
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      existingUser?._id
    );
    delete existingUser.password;
    delete existingUser?.refreshToken;

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        existingUser: existingUser,
        isSuccess: true,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
  }

  return res
    .status(201)
    .json({ isSuccess: true, user: googleUser, existingUser: existingUser });
});

export const makeAccountPrivate = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { isPrivate } = req.query;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isPrivate: isPrivate },
    { new: true }
  );
  return res.status(200).json({ isSuccess: !!updatedUser, updatedUser });
});

export const createUsers = asyncHandler(async (_, res) => {
  const u = users.forEach(async (user) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(user.username, salt);
    await User.create({
      email: user.email,
      password: hash,
      name: user.name,
      username: user.username,
    });
  });

  return res.status(201).json({ message: "Users created successfully" });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1; // Get the page parameter from the query string or default to page 1
  const size = 10; // Number of users per page
  const usernameQuery = req.query.username;

  let query = {}; // Default empty query object

  if (usernameQuery) {
    // If username query parameter exists, create a query to search by username starting with the query string
    query = { username: { $regex: `^${usernameQuery}`, $options: "i" } };
  }
  const count = await User.countDocuments(query);
  const totalPages = Math.ceil(count / size);

  const users = await User.find(query)
    .select("-password -__v")
    .sort({ updatedAt: -1 })
    .skip((page - 1) * size)
    .limit(size)
    .lean();

  return res.status(200).json({
    users: users,
    currentPage: page,
    totalPages: totalPages,
  });
});

export const getAllUsersIds = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const size = 10;
  const usernameQuery = req.query.username;

  let pipeline = [];

  if (usernameQuery) {
    // If username query parameter exists, add a $match stage to the pipeline
    pipeline.push({
      $match: { username: { $regex: `^${usernameQuery}`, $options: "i" } },
    });
  }

  // Add the $facet stage to get total count and paginated results
  pipeline.push(
    {
      $facet: {
        metadata: [{ $count: "total" }],
        users: [
          { $sort: { updatedAt: -1 } },
          { $skip: (page - 1) * size },
          { $limit: size },
          {
            $project: {
              _id: 1,
              username: 1,
              value: "$_id",
              label: "$username",
            },
          },
        ],
      },
    },
    {
      $unwind: "$metadata",
    }
  );

  // Execute the aggregation pipeline
  const [data] = await User.aggregate(pipeline);

  const totalPages = Math.ceil(data?.metadata?.total / size);

  return res.status(200).json({
    users: data?.users || [],
    currentPage: page,
    totalPages: totalPages,
  });
});

export const createNewUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    users: users,
    currentPage: page,
    totalPages: totalPages,
  });
});

export const editNewUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  console.log(req.body)

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...req.body,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json({
    user: user,
  });
});

export const dashboardData = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalPosts = await Post.countDocuments();
  const totalLikes = await Like.countDocuments();
  const totalComments = await Comment.countDocuments();
  const totalFollowRequests = await FollowRequest.countDocuments();
  const totalFollow = await Follow.countDocuments();
  const totalMessages = await Message.countDocuments();
  const totalChats = await Chat.countDocuments();

  console.log("dashboard call------------------------");

  const data = [
    { label: "Accounts", count: totalUsers, route: "user" },
    { label: "Posts", count: totalPosts, route: "posts" },
    { label: "Likes", count: totalLikes, route: "likes" },
    { label: "Comments", count: totalComments, route: "comments" },
    {
      label: "Requests",
      count: totalFollowRequests,
      route: "followRequests",
    },
    { label: "Follow", count: totalFollow, route: "follows" },
    { label: "Messages", count: totalMessages, route: "messages" },
    { label: "Chats", count: totalChats, route: "chats" },
  ];

  res.status(200).json(data);
});

export const getUserByUsernameA = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(404, "username not found");
  }

  const user = await User.findOne({ username }).lean();
  if (!user) {
    throw new ApiError(404, "username not found");
  }
  res.status(200).json({ user: user, message: "userFetched SuccessFully" });
});

export const getUserByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(404, "username not found");
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, "username not found");
  }
  res.status(200).json({ user: user, message: "userFetched SuccessFully" });
});

export const deleteUsersByIds = asyncHandler(async (req, res) => {
  const ids = req.body;

  const deletedUsers = await User.deleteMany({ _id: { $in: ids } });

  const deletedPosts = await Post.deleteMany({ userId: { $in: ids } });

  const deletedFollows = await Follow.deleteMany({ followerId: { $in: ids } });

  const deletedFollowings = await Follow.deleteMany({
    followeeId: { $in: ids },
  });

  return res.status(200).json({
    deletedUsers,
    deletedPosts,
    deletedFollows,
    deletedFollowings,
    message: "users deleted successfully",
  });
});

export const deleteUserById = asyncHandler(async (req, res) => {
  const id = req.body.id;

  const deletedUser = await User.deleteOne({ _id: id });

  const deletedPost = await Post.deleteOne({ userId: id });

  const deletedFollow = await Follow.deleteOne({ followerId: id });

  const deletedFollowing = await Follow.deleteOne({ followeeId: id });

  return res.status(200).json({
    deletedUser,
    deletedPost,
    deletedFollow,
    deletedFollowing,
    message: "users deleted successfully",
  });
});

export const getSendUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { search } = req.query;
  let users = [];

  if (!search) {
    users = await User.aggregate([
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
  } else {
    users = await User.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(userId) },
          username: { $regex: `^${search}`, $options: "i" },
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
  }

  return res.status(200).json({
    data: users,
    isSuccess: true,
  });
});
