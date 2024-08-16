import { Follow } from "../models/follow.model.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.modal.js";

export const generateAccessAndRefreshTokens = async (userId) => {
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

export const getMutualFriends = async (visitingUserId, profileUserId) => {
  try {
    const mutualFriends = await Follow.aggregate([
      {
        // Find all follow records where either the visiting user or the profile user is the follower
        $match: {
          $or: [
            { followerId: new mongoose.Types.ObjectId(visitingUserId) },
            { followerId: new mongoose.Types.ObjectId(profileUserId) },
          ],
        },
      },
      {
        // Group by followeeId and collect all followerIds in an array
        $group: {
          _id: "$followeeId",
          followers: { $addToSet: "$followerId" },
        },
      },
      {
        // Only keep those followees who are followed by both the visiting user and the profile user
        $match: {
          followers: {
            $all: [
              new mongoose.Types.ObjectId(visitingUserId),
              new mongoose.Types.ObjectId(profileUserId),
            ],
          },
        },
      },
      {
        // Join with the User collection to get the details of the mutual friends
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        // Flatten the userDetails array
        $unwind: "$userDetails",
      },
      {
        // Project the desired fields from userDetails
        $project: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          username: "$userDetails.username",
          avatar: "$userDetails.avatar",

          // Add any other fields you want to project
        },
      },
    ]);

    return mutualFriends;
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong line5 helpers/user/getMutualFriends");
  }
};
