import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const followUser = asyncHandler(async (req, res) => {
  const { userId: followerId } = req.user;
  const { followeeId } = req.params;

  const existingFollow = await Follow.findOne({ followerId, followeeId });

  if (existingFollow) {
    throw new ApiError(404, "Already follows this user");
  }

  const follow = new Follow({
    followerId,
    followeeId,
  });

  const result = await follow.save();

  return res.status(200).json({ follow: true, result: result });
});

export const unfollowUser = asyncHandler(async (req, res) => {
  const { userId: followerId } = req.user;
  const { followeeId } = req.params;

  const result = await Follow.findOneAndDelete({ followerId, followeeId });

  if (!result) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({ unfollow: true, result: result });
});

export const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userId: currUserId } = req.params;

  const sameUser = userId === currUserId;

  const followers = await Follow.aggregate([
    {
      $match: {
        followeeId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "followerId",
        foreignField: "_id",
        as: "follower",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              profilePicture: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$follower",
    },
    {
      $addFields: {
        isFollow: {
          $eq: [new mongoose.Types.ObjectId(currUserId), "$followeeId"],
        },
      },
    },
    {
      $addFields: {
        canRemove: {
          $eq: [sameUser, "$isFollow"],
        },
      },
    },

    {
      $project: {
        _id: "$follower._id",
        username: "$follower.username",
        profilePicture: "$follower.profilePicture",
        isFollow: "$isFollow",
        canRemove: "$canRemove",
      },
    },
  ]);

  return res.status(200).json({ isSuccess: true, followers: [...followers] });
});

export const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Include username in the request params
  const { username } = req.query;
  const matchStage = {
    $match: {
      followerId: new mongoose.Types.ObjectId(userId),
    },
  };

  const usernameMatchStage = username
    ? {
        $lookup: {
          from: "users",
          let: { followeeId: "$followeeId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$followeeId"] },
                    {
                      $regexMatch: {
                        input: "$username",
                        regex: `^${username}`,
                        options: "i",
                      },
                    },
                  ],
                },
              },
            },
          ],
          as: "following",
        },
      }
    : {
        $lookup: {
          from: "users",
          localField: "followeeId",
          foreignField: "_id",
          as: "following",
          pipeline: [
            {
              $addFields: {
                isFollow: true,
              },
            },
            {
              $project: {
                _id: 1,
                username: 1,
                profilePicture: 1,
                isFollow: 1,
                isActive: 1,
              },
            },
          ],
        },
      };

  const followings = await Follow.aggregate([
    matchStage,
    usernameMatchStage, // Include the username match stage
    {
      $unwind: "$following", // Unwind the 'following' array
    },
    {
      $project: {
        _id: "$following._id",
        username: "$following.username",
        profilePicture: "$following.profilePicture",
        isFollow: "$following.isFollow",
      },
    },
  ]);

  // The 'followings' variable now contains the modified data structure.

  return res.status(200).json({ isSuccess: true, followings: [...followings] });
});
