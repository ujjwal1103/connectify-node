import axios from "axios";
import User from "../models/user.modal.js";
import bcrypt from "bcryptjs";
import QueryString from "qs";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { deleteImage } from "../utils/uploadImage.js";
import mongoose from "mongoose";

import { users } from "../userdata.js";
import Post from "../models/post.modal.js";
import { Follow } from "../models/follow.model.js";
import { getObjectId } from "../utils/index.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access token"
    );
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  if (
    [username, password, email].some((feild) => !feild || feild.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required");
  }
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(
      409,
      `User with ${username} and ${email} already exists`
    );
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const user = await User.create({
    email,
    password: hash,
    username: username.toLowerCase(),
  });

  return res.status(201).json({
    isSuccess: true,
    message: `Welcome To connectify : ${user.username}`,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username })
    .select("username email name password")
    .lean();
  if (!user) {
    throw new ApiError(400, `user with ${username} not found`);
  }
  const matchPassword = await bcrypt.compare(password, user.password);
  if (!matchPassword) {
    throw new ApiError(400, "Incorrect username and password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user?._id
  );
  delete user.password;
  delete user?.refreshToken;

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
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

  const Id = getObjectId(userId);

  const user = await User.aggregate([
    {
      $match: {
        _id: Id,
      },
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
  ]);

  if (!user[0]) {
    throw new ApiError(400, "UserId not found");
  }
  return res.status(200).json({
    user: user[0],
    isSuccess: true,
  });
});

export const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { userId } = req.user;

  const Id = getObjectId(userId);

  const user = await User.aggregate([
    {
      $match: {
        username: username,
      },
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
      },
    },
  ]);

  if (!user[0]) {
    throw new ApiError(400, "UserId not found");
  }
  return res.status(200).json({
    user: user[0],
    isSuccess: true,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const page = req.query.page || 1; // Default to page 1 if not provided
  const limit = +req.query.limit || 10; // Default limit to 10 if not provided

  const skip = (page - 1) * limit;

  const users = await User.aggregate([
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
      },
    },
    {
      $match: {
        followers: {
          $not: {
            $elemMatch: { followerId: new mongoose.Types.ObjectId(userId) },
          },
        },
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
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  const totalCount = await User.countDocuments({
    _id: { $ne: new mongoose.Types.ObjectId(userId) },
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasMore = page < totalPages;
  return res.status(200).json({
    users: users,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalUsers: totalCount,
      perPage: limit,
      hasMore,
    },
    isSuccess: true,
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

export const deleteUser = async (req, res) => {
  const { userId } = req.user;
  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        isSuccess: false,
        message: "User not found",
      });
    }
    const result = await User.deleteOne({ _id: userId });

    return res.status(200).json({
      result: result,
      isSuccess: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      isSuccess: false,
      errorName: error.name,
      errorMessage: error.message,
      error: "Internal server error",
      message: "Something went wrong",
    });
  }
};

export const editUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { username, bio, name, gender } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw ApiError(400, "User not found");
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

  const resp = await uploadOnCloudinary(req.file.path, `${user?._id}/profilePictures`

  );

  const avatar = resp.url;
  const avatarWithPublicId = {
    url: resp.url,
    publicId: resp.public_id,
  };


  if (!avatar) throw new ApiError(400, "Failed to upload profile pIcture");

  await User.findByIdAndUpdate(
    userId,
    {
      avatar,
      avatarWithPublicId,
    },
    { new: true }
  );

  if (user?.avatarWithPublicId?.publicId) {
    await deleteFromCloudinary([user.avatarWithPublicId.publicId]);
  }

  return res.status(200).json({ success: true, avatars: { avatar } });
});

export const removeProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, "User not found");

  if (user?.avatarWithPublicId?.publicId) {
    await deleteFromCloudinary([user.avatarWithPublicId.publicId]);
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

export const searchUsers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { query } = req.query;

  if (!query && query !== "") {
    throw new ApiError(400, "query param is missing");
  }

  const users = await User.find({
    _id: { $ne: userId },
    $or: [
      { name: { $regex: query, $options: "i" } },
      { username: { $regex: query, $options: "i" } },
    ],
  }).select("_id username avatar");

  return res.status(200).json({
    users: users,
    isSuccess: true,
  });
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

export const googleAuthentication = async (req, res) => {
  const { code } = req.query;

  try {
    return res.redirect(process.env.REACT_REDIRECT_URI + code);
  } catch (error) {
    return res.status(404).json({ message: "something went wrong" });
  }
};

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

export const googleAuthenticate = async (req, res) => {
  const { code } = req.query;

  try {
    const { id_token, access_token } = await getGoogleAuthToken(code);

    const googleUser = await getGoogleUser({ id_token, access_token });

    if (!googleUser.verified_email) {
      return res.status(403).send("Google account is not verified");
    }

    const existingUser = await User.findOne({ email: googleUser.email });

    return res
      .status(201)
      .json({ isSuccess: true, user: googleUser, existingUser: existingUser });
  } catch (error) {
    return res.status(404).json({ message: "something went wrong" });
  }
};

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

  res.status(200).json({
    totalUsers,
    totalPosts,
  });
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
