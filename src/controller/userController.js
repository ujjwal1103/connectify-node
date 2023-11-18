import axios from "axios";
import User from "../models/userModal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QueryString from "qs";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";

// register a new user to connectify
export const registerUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        error: "User exists",
        message: `User with ${username} already exists`,
        isSuccess: false,
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const user = new User({ ...req.body, password: hash });

    const newUser = await user.save();
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      "ujjwal",
      {
        expiresIn: "1d",
      }
    );
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
    };
    return res
      .status(201)
      .json({ isSuccess: true, token: token, user: userResponse });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Internal server Error",
      message: error.message || "Something went wrong",
      isSuccess: false,
    });
  }
};

// login to connectify
export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      const matchPassword = await bcrypt.compare(password, user.password);
      if (matchPassword) {
        const token = jwt.sign(
          { userId: user._id, username: user.username },
          "ujjwal",
          {
            expiresIn: "1d",
          }
        );

        const userResponse = {
          _id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
        };

        return res
          .status(201)
          .json({ user: userResponse, isSuccess: true, token: token });
      } else {
        return res.status(400).json({
          error: "Incorrect creadantials",
          message: `Incorrect username and password`,
          isSuccess: false,
        });
      }
    } else {
      return res.status(400).json({
        error: "User not found",
        message: `user with ${username} not found`,
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: error || "Something went wrong",
      isSuccess: false,
    });
  }
};

//get info of logged in user
export const getUser = async (req, res) => {
  const { userId } = req.user;
  try {
    if (userId !== null && userId !== "") {
      const user = await User.findOne({ _id: userId }).select("-password -__v");
      return res.status(200).json({ user: user, isSuccess: true });
    } else {
      return res.status(500).json({
        error: "userId is empty",
        message: "userId is empty",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: error || "Something went wrong",
      isSuccess: false,
    });
  }
};

export const getUserByUsername = async (req, res) => {
  const { username } = req.params;
  try {
    if (username !== null && username !== "") {
      const user = await User.findOne({ username: username })
        .select("-password -__v")
        .populate("posts");
      return res.status(200).json({ user: user, isSuccess: true });
    } else {
      return res.status(500).json({
        error: "userId is empty",
        message: "userId is empty",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: error || "Something went wrong",
      isSuccess: false,
    });
  }
};

// get all users wanted to add pagination to the this endpoint
export const getUsers = async (req, res) => {
  const { userId } = req.user;
  const { page = 1, pageSize = 10 } = req.query;
  try {
    const skip = (page - 1) * pageSize;

    const currentUser = await User.findOne({ _id: userId });

    const followingList = currentUser.following;

    const users = await User.find({
      _id: { $ne: userId, $nin: followingList },
    })
      .skip(skip)
      .limit(Number(pageSize))
      .select("-password -__v");

    const totalRecords = await User.countDocuments({ _id: { $ne: userId } });
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
    const { friendId } = req.body; // Assuming you send the target user's ID in the request body

    // Check if the user exists
    const currentuser = await User.findById(userId);
    const targetUser = await User.findById(friendId);

    if (!targetUser) {
      return res.status(404).json({
        isSuccess: false,
        message: "User not found",
      });
    }

    if (targetUser.isPrivate) {
      // Check if the friend request has already been sent
      if (currentuser.sentfriendRequest.includes(friendId)) {
        return res.status(400).json({
          isSuccess: false,
          message: "Friend request already sent",
        });
      }
      // Add the target user's ID to the current user's friendRequestsSent array
      currentuser.sentfriendRequest.push(friendId);
      await currentuser.save();

      return res.status(200).json({
        user: currentuser,
        targetUser: targetUser,
        isSuccess: true,
        message: "Friend request sent successfully",
      });
    }

    if (currentuser.following.includes(friendId)) {
      return res.status(400).json({
        isSuccess: false,
        message: "already follows user",
      });
    }
    currentuser.following.push(friendId);
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
    let url = "";
    if (user) {
      if (req.file) {
        url = await uploadImage(req.file.originalname, "profilePics");
      } else {
        deleteImage(user?.profilePicture);
      }
      const result = await User.findByIdAndUpdate(
        userId,
        { username, bio, name, profilePicture: url, gender },
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

export const getFollowers = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ _id: userId }).populate({
      path: "followers",
      select: "_id username profilePicture",
    });
    if (user) {
      return res.status(200).json({
        users: user.followers,
        isSuccess: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: "Something went wrong",
      isSuccess: false,
    });
  }
};

// send list of all following of requested user

export const getFollowing = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ _id: userId }).populate({
      path: "following",
      select: "_id username profilePicture",
    });
    if (user) {
      return res.status(200).json({
        users: user.following,
        isSuccess: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server Error",
      message: "Something went wrong",
      isSuccess: false,
    });
  }
};

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
