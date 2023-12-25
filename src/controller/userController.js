import axios from "axios";
import User from "../models/user.modal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QueryString from "qs";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";
import mongoose from "mongoose";
import { getSingleUser } from "../aggregations/user.js";
import { users } from "../userdata.js";

// register a new user to connectify
export const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  if (
    [username, password, email].some((feild) => !feild || feild.trim() === "")
  ) {
    throw new ApiError(400, "All feilds are required");
  }
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(409, `User with ${username} already exists`);
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

// login to connectify
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
    throw new ApiError(400, "Incorrect username name and password");
  }
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECREATE,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  delete user.password;

  return res
    .status(201)
    .json({ user: { ...user }, isSuccess: true, token: token });
});

//get info of logged in user
export const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const userAggregate = getSingleUser(userId);

  const user = await User.aggregate(userAggregate);

  if (!user[0]) {
    throw new ApiError(400, "UnAuthorized UserId not found");
  }

  return res.status(200).json({
    user: user[0],
    isSuccess: true,
  });
});

export const getUserByUsername = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { username } = req.params;

  const user = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $addFields: {
        isFollow: {
          $in: [new mongoose.Types.ObjectId(userId), "$followers"],
        },
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
    {
      $project: {
        password: 0,
        receivedfriendRequest: 0,
        __v: 0,
        sentfriendRequest: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    },
  ]);

  return res.status(200).json({
    user: user[0],
    isSuccess: true,
  });
});

export const getUsers = async (req, res) => {
  const { userId } = req.user;
  try {
    const currentUser = await User.findOne({ _id: userId });
    const followingList = currentUser.following;
    const users = await User.find({
      _id: { $ne: userId, $nin: followingList },
    })
      .select("_id username name profilePicture")
      .limit(5);

    return res.status(200).json({
      users: users,
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: "Something went wrong",
      isSuccess: false,
    });
  }
};

export const getFriends = async (req, res) => {
  const { userId } = req.user;
  const { page = 1, pageSize = 10 } = req.query;
  try {
    const skip = (page - 1) * pageSize;

    const currentUser = await User.findOne({ _id: userId });

    const followingList = currentUser.following;
    const followersList = currentUser.followers;

    // Merge followers and following list to get all connected users
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal server Error",
      message: "Something went wrong",
      isSuccess: false,
    });
  }
};

export const sendFriendRequest = async (req, res) => {
  const { userId } = req.user;
  try {
    const { friendId: towhomeFollow } = req.body; // Assuming you send the target user's ID in the request body

    // Check if the user exists
    const currentuser = await User.findById(userId);
    const targetUser = await User.findById(towhomeFollow);

    if (!targetUser || !currentuser) {
      return res.status(404).json({
        isSuccess: false,
        message: "User not found",
      });
    }

    if (targetUser.isPrivate) {
      if (currentuser.sentfriendRequest.includes(towhomeFollow)) {
        return res.status(400).json({
          isSuccess: false,
          message: "Friend request already sent",
        });
      }
      currentuser.sentfriendRequest.push(towhomeFollow);
      await currentuser.save();

      return res.status(200).json({
        isSuccess: true,
        message: "Friend request sent successfully",
      });
    }

    if (currentuser.following.includes(towhomeFollow)) {
      return res.status(400).json({
        isSuccess: false,
        message: "already follows user",
      });
    }
    currentuser.following.push(towhomeFollow);
    await currentuser.save();

    targetUser.followers.push(currentuser._id);
    await targetUser.save();

    return res.status(200).json({
      user: currentuser,
      targetUser: targetUser,
      isSuccess: true,
      message: "followed user successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      isSuccess: false,
      error: "Internal server error",
      message: "Something went wrong",
    });
  }
};

// delete an existing user from the database

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

// edit user by userId

export const editUser = async (req, res) => {
  const { userId } = req.user;
  const { username, bio, name, gender } = req.body;
  try {
    const user = await User.findById(userId);
    let url;
    if (user) {
      if (req.file) {
        url = await uploadImage(req.file.originalname, "profilePics");
      }
      const result = await User.findByIdAndUpdate(
        userId,
        {
          username,
          bio,
          name,
          // profilePicture:process.env.IMAGE_PATH + req.file.originalname,
          profilePicture: url,
          gender,
        },
        { new: true }
      );
      return res.status(200).json({
        user: result,
        isSuccess: true,
        message: "User updated successfully",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isSuccess: false,
      error: error.name || error,
      message: error.message || "Something went wrong",
    });
  }
};

//get all user who match search
export const searchUsers = async (req, res) => {
  const { userId } = req.user;
  const { query } = req.query;

  try {
    if (query) {
      const users = await User.find({
        _id: { $ne: userId },
        $or: [
          { name: { $regex: query, $options: "i" } }, // Case-insensitive search for name
          { username: { $regex: query, $options: "i" } }, // Case-insensitive search for username
        ],
      }).select("_id username profilePicture");

      return res.status(200).json({
        users: users,
        isSuccess: true,
      });
    }
    return res.status(200).json({
      users: [],
      isSuccess: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal server Error",
      message: "Something went wrong",
      isSuccess: false,
    });
  }
};

// send list of all followers of requested user

export const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userId: currentUserId } = req.user;

  console.log(userId, currentUserId);

  const isSameUser = currentUserId === userId;

  const users = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(userId) }, // Match the specific user
    },
    {
      $project: {
        followers: 1,
        _id: 0,
      },
    },
    {
      $unwind: {
        path: "$followers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "followers",
        foreignField: "_id",
        as: "follower",
      },
    },
    {
      $addFields: {
        _id: { $first: "$follower._id" },
        username: { $first: "$follower.username" },
        name: { $first: "$follower.name" },
        profilePicture: { $first: "$follower.profilePicture" },
        canRemove: {
          $cond: {
            if: isSameUser,
            then: true,
            else: false,
          },
        },
        isFollow: {
          $cond: {
            if: isSameUser,
            then: true,
            else: {
              $in: [
                new mongoose.Types.ObjectId(currentUserId),
                "$follower._id",
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        profilePicture: 1,
        isFollow: 1,
        name: 1,
        canRemove: 1,
      },
    },
  ]);

  if (users.length) {
    return res.status(200).json({
      users: users,
      isSuccess: true,
    });
  }
});

export const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userId: currentUserId } = req.user;

  const isSameUser = currentUserId === userId;

  const users = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(userId) }, // Match the specific user
    },
    {
      $project: {
        following: 1,
        _id: 0,
      },
    },
    {
      $unwind: {
        path: "$following",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "following",
        foreignField: "_id",
        as: "following",
      },
    },
    {
      $addFields: {
        _id: { $first: "$following._id" },
        username: { $first: "$following.username" },
        name: { $first: "$following.name" },
        profilePicture: { $first: "$following.profilePicture" },
        isFollow: {
          $cond: {
            if: isSameUser,
            then: true,
            else: {
              $in: [
                new mongoose.Types.ObjectId(currentUserId),
                "$following._id",
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        profilePicture: 1,
        isFollow: 1,
        name: 1,
      },
    },
  ]);
  if (!users?.length) {
    throw new ApiError(400, `users not found`);
  }

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

  console.log(values);
  try {
    const res = await axios.post(url, QueryString.stringify(values), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log("response:", res);

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
    console.log("authenticated user", res.data);
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

export const unfollowUser = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const { userId } = req.user;

  //check if friendId is present in current users following list
  const currentuser = await User.findById(userId);
  const targetUser = await User.findById(friendId);

  if (
    currentuser.following.includes(friendId) &&
    targetUser.followers.includes(userId)
  ) {
    console.log("entererd");
    currentuser.following.pop(friendId);
    currentuser.following.pop(friendId);
    await currentuser.save();

    targetUser.followers.pop(userId);
    await targetUser.save();
    return res.status(200).json({ isSuccess: true });
  }
});

export const makeAccountPrivate = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isPrivate: true },
    { new: true }
  );
  return res.status(200).json({ isSuccess: !!updatedUser });
});

export const createUsers = asyncHandler(async (req, res) => {
  const u = users.forEach(async (user) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(user.username, salt);
    await User.create({
      email: user.email,
      password: hash,
      username: user.username,
    });
  });

  console.log(u);

  return res.status(201).json({ message: "Users created successfully" });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1; // Get the page parameter from the query string or default to page 1
  const size = 10; // Number of users per page

  const count = await User.countDocuments();
  const totalPages = Math.ceil(count / size);

  const users = await User.find()
    .select("-password -__v")
    .skip((page - 1) * size)
    .limit(size);

  return res.status(200).json({
    users: users,
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
        username: req?.body?.username,
        name: req?.body?.name,
        email: req?.body?.email,
        profilePicture: req?.body?.profilePicture,
        mobileNumber: req.body?.mobileNumber,
        gender: req?.body?.gender,
        isPrivate: req?.body?.isPrivate,
        isActive: req?.body?.isActive,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json({
    user: user,
  });
});
