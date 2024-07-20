import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notificationController.js";
import User from "../models/user.modal.js";
import { FollowRequest } from "../models/followRequest.modal.js";
import { emitEvent, getMongoosePaginationOptions } from "../utils/index.js";
import { NEW_REQUEST } from "../utils/constant.js";

export const followUser = asyncHandler(async (req, res) => {
  const { userId: followerId } = req.user;
  const { followeeId } = req.params;

  if (followerId === followeeId) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const followee = await User.findById(followeeId);

  if (!followee) {
    throw new ApiError(404, "User to be followed does not exist");
  }

  if (followee.isPrivate) {
    const existingFollowRequest = await FollowRequest.findOne({
      requestedBy: followerId,
      requestedTo: followeeId,
    });

    if (existingFollowRequest) {
      throw new ApiError(409, "Request Already Sent", { isRequested: true });
    }

    const followRequest = await FollowRequest.create({
      requestedBy: followerId,
      requestedTo: followeeId,
    });

    const resp = await createNotification({
      from: followerId,
      text: "Requested to follow you",
      to: followeeId,
      type: "FOLLOW_RESQUEST_SENT",
      requestId: followRequest._id,
    });

    emitEvent(req, NEW_REQUEST, [followeeId], resp);

    return res.status(200).json({ requested: true, followRequest });
  }

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
    text: "Started following you",
    to: followeeId,
    type: "FOLLOWING",
    followId: rsp._id,
  };

  const resp = await createNotification(notifObj);

  emitEvent(req, "FOLLOWING", [followeeId, followerId], resp);

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
  const { userId: currentUserId } = req.user;
  const { username, page = 1, limit = 20 } = req.query;

  const matchStage = {
    $match: {
      followeeId: new mongoose.Types.ObjectId(userId),
    },
  };

  const usernameMatchStage = username
    ? {
        $lookup: {
          from: "users",
          let: { followerId: "$followerId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$followerId"] },
                    {
                      $or: [
                        {
                          $regexMatch: {
                            input: "$username",
                            regex: `.*${username}.*`,
                            options: "i",
                          },
                        },
                        {
                          $regexMatch: {
                            input: "$name",
                            regex: `.*${username}.*`,
                            options: "i",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "followers",
        },
      }
    : {
        $lookup: {
          from: "users",
          localField: "followerId",
          foreignField: "_id",
          as: "followers",
          pipeline: [
            {
              $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "followerId",
                as: "follow",
                pipeline: [
                  {
                    $match: {
                      followeeId: new mongoose.Types.ObjectId(currentUserId),
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

  const followers = Follow.aggregate([
    matchStage,
    usernameMatchStage,
    {
      $unwind: "$followers",
    },
    {
      $project: {
        _id: "$followers._id",
        username: "$followers.username",
        name: "$followers.name",
        avatar: "$followers.avatar",
        isFollow: "$followers.isFollow",
        follow: "$followers.follow",
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
  ]);

  const paginatedFollowers = await Follow.aggregatePaginate(
    followers,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "followers" },
    })
  );

  return res.status(200).json({
    isSuccess: true,
    ...paginatedFollowers,
  });
});

export const getFollowing = asyncHandler(async (req, res) => {
  const { userId: currentUserId } = req.user;
  const { userId } = req.params; // Include username in the request params
  const { username, page = 1, limit = 20 } = req.query;

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
              $lookup: {
                from: "followrequests",
                localField: "_id",
                foreignField: "requestedTo",
                as: "request",
                pipeline: [
                  {
                    $match: {
                      requestedBy: new mongoose.Types.ObjectId(currentUserId),
                      requestStatus: "PENDING",
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
                isRequested: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $size: "$request",
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
                isFollow: 1,
                follow: 1,
                isPrivate: 1,
                isRequested: 1,
              },
            },
          ],
        },
      };

  const followings = Follow.aggregate([
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
        isFollow: "$following.isFollow",
        follow: "$following.follow",
        isPrivate: "$following.isPrivate",
        isRequested: "$following.isRequested",
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
  ]);

  const paginatedFollowings = await Follow.aggregatePaginate(
    followings,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "following" },
    })
  );
  return res.status(200).json({ isSuccess: true, ...paginatedFollowings });
});

//admin controller
export const getAllFollowers = asyncHandler(async (req, res) => {
  const follows = await Follow.find().populate("followerId followeeId");
  return res.status(200).json({ follows });
});
