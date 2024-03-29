import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notificationController.js";

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

  const rsp = await follow.save();

  const notifObj = {
    from: followerId,
    text: "started following you",
    to: followeeId,
    type: "FOLLOWING",
    followId: rsp._id,
  };

  const resp = await createNotification(notifObj);

  return res.status(200).json({ follow: true, result: rsp });
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
  const { userId: currUserId } = req.user;

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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$follower",
    },
    {
      $addFields: {},
    },
    {
      $addFields: {
        isFollow: {
          $eq: [new mongoose.Types.ObjectId(currUserId), "$followeeId"],
        },
        canRemove: sameUser,
      },
    },

    {
      $project: {
        _id: "$follower._id",
        username: "$follower.username",
        avatar: "$follower.avatar",
        isFollow: "$isFollow",
        canRemove: "$canRemove",
      },
    },
  ]);

  return res.status(200).json({ isSuccess: true, followers: [...followers] });
});

export const getFollowing = asyncHandler(async (req, res) => {
  const { userId: currentUserId } = req.user;
  const { userId } = req.params; // Include username in the request params
  const { username, page = 1, pageSize = 10 } = req.query;

  const skipCount = (page - 1) * pageSize;

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
              $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "followeeId",
                as: "follow",
                pipeline: [
                  {
                    $match: {
                      followerId: new mongoose.Types.ObjectId(currentUserId),
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                isFollow: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $size: "$follow",
                        },
                        1,
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },

            {
              $project: {
                _id: 1,
                username: 1,
                name: 1,
                avatar: 1,
                isFollow: 1,
                follow: 1,
              },
            },
          ],
        },
      };

  const followings = await Follow.aggregate([
    matchStage,
    usernameMatchStage,
    {
      $unwind: "$following",
    },
    {
      $project: {
        _id: "$following._id",
        username: "$following.username",
        name: "$following.name",
        avatar: "$following.avatar",
        isFollow: "$following.isFollow",
        follow: "$following.follow",
      },
    },
    {
      $addFields: {
        isCurrentUser: {
          $eq: ["$_id", new mongoose.Types.ObjectId(currentUserId)],
        },
      },
    },
    {
      $sort: {
        isCurrentUser: -1,
        isFollow: -1,
      },
    },
    {
      $skip: skipCount,
    },
    {
      $limit: pageSize,
    },
  ]);

  return res
    .status(200)
    .json({ isSuccess: true, followings, hasMore: followings.length > 0 });
});

export const getAllFollowers = asyncHandler(async (req, res) => {
  const follows = await Follow.find().populate("followerId followeeId");
  return res.status(200).json({ follows });
});
