import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { FollowRequest } from "../models/followRequest.modal.js";
import {
  createNotification,
  deleteNotification,
} from "./notificationController.js";
import { Follow } from "../models/follow.model.js";
import Notification from "../models/notification.modal.js";
import { emitEvent } from "../utils/index.js";
import { ACCEPT_REQUEST, NEW_REQUEST } from "../utils/constant.js";

export const sendFollowRequest = asyncHandler(async (req, res) => {
  const { userId: requestedBy } = req.user;
  const { requestedTo } = req.params;

  const existingFollowRequest = await FollowRequest.findOne({
    requestedBy,
    requestedTo,
  });

  if (existingFollowRequest) {
    throw new ApiError(409, "Request Already Sent");
  }

  const followRequest = await FollowRequest.create({
    requestedBy,
    requestedTo,
  });

  const resp = await createNotification({
    from: requestedBy,
    text: "Requested to follow you",
    to: requestedTo,
    type: "FOLLOW_RESQUEST_SENT",
    requestId: followRequest._id,
  });

  emitEvent(req, NEW_REQUEST, [requestedTo], resp);

  return res.status(200).json({ requested: true, followRequest });
});

export const deleteFollowRequest = asyncHandler(async (req, res) => {
  const { userId: requestedBy } = req.user;
  const { requestedTo } = req.params;

  const result = await FollowRequest.findOneAndDelete({
    requestedBy,
    requestedTo,
  });

  if (!result) {
    throw new ApiError(404, "User not found");
  }

  const resp = await deleteNotification(requestedBy, requestedTo);
  emitEvent(req, NEW_REQUEST, [requestedTo], resp);
  return res.status(200).json({ requestCancel: true, result });
});

export const getFollowRequestForUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const request = await FollowRequest.find({
    requestedTo: userId,
    requestStatus: "PENDING",
  }).populate("requestedBy");

  return res.status(200).json({ isSuccess: true, followRequest: request });
});

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
export const acceptFollowRequest = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { requestId } = req.params;
  const { reject = false } = req.query;

  const request = await FollowRequest.findByIdAndUpdate(requestId, {
    requestStatus: reject ? "REJECTED" : "ACCEPTED",
  },{new:true});

  if(reject){
    return res.status(200).json({
      isSuccess: true,
      followRequest: request
    });
  }

  if (!request) {
    throw new ApiError(404, "Invalid Request");
  }
  //create a followRecord
  const followeeId = userId;
  const followerId = request.requestedBy;

  const follow = new Follow({
    followerId,
    followeeId,
  });

  const followResult = await follow.save();

  //notification update for curr user
  const notification = await Notification.findOneAndUpdate(
    { from: followerId, to: userId },
    { type: "FOLLOWING", text: "started following you" },
    { new: true }
  );

  //send notifcation as request accepted
  const resp = await createNotification({
    from: followeeId,
    text: "accepted your follow request",
    to: followerId,
    type: "FOLLOW_REQUEST_ACCEPTED",
    followId: followResult._id,
  });

  emitEvent(req, ACCEPT_REQUEST, [followeeId, followerId], resp);

  return res.status(200).json({
    isSuccess: true,
    followRequest: request,
    followResult,
    notification,
    resp,
  });
});

export const getSentFollowRequests = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const sentRequests = await FollowRequest.aggregate([
    {
      $match: {
        requestedBy: new mongoose.Types.ObjectId(userId),
        requestStatus: "PENDING",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "requestedTo",
        foreignField: "_id",
        as: "requestedToUser",
      },
    },
    {
      $unwind: "$requestedToUser",
    },
    {
      $project: {
        _id: 1,
        requestedTo: "$requestedToUser._id",
        username: "$requestedToUser.username",
        name: "$requestedToUser.name",
        avatar: "$requestedToUser.avatar",
      },
    },
  ]);

  return res.status(200).json({ isSuccess: true, sentRequests });
});

export const getRequest = asyncHandler(async (req, res) => {
  const { requestedBy } = req.params;
  const { userId: requestedTo } = req.user;

  if (!requestedBy) {
    throw new ApiError(400, "RequestedBy Is Missing");
  }

  const request = await FollowRequest.findOne({
    requestedBy,
    requestedTo,
    requestStatus: "PENDING",
  }).lean();

  return res.json({
    isSuccess: true,
    request,
  });
});

// export const getFollowers = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const { userId: currUserId } = req.user;

//   const sameUser = userId === currUserId;

//   const followers = await Follow.aggregate([
//     {
//       $match: {
//         followeeId: new mongoose.Types.ObjectId(userId),
//       },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "followerId",
//         foreignField: "_id",
//         as: "follower",
//         pipeline: [
//           {
//             $project: {
//               _id: 1,
//               username: 1,
//               avatar: 1,
//             },
//           },
//         ],
//       },
//     },
//     {
//       $unwind: "$follower",
//     },
//     {
//       $addFields: {},
//     },
//     {
//       $addFields: {
//         isFollow: {
//           $eq: [new mongoose.Types.ObjectId(currUserId), "$followeeId"],
//         },
//         canRemove: sameUser,
//       },
//     },

//     {
//       $project: {
//         _id: "$follower._id",
//         username: "$follower.username",
//         avatar: "$follower.avatar",
//         isFollow: "$isFollow",
//         canRemove: "$canRemove",
//       },
//     },
//   ]);

//   return res.status(200).json({ isSuccess: true, followers: [...followers] });
// });

// export const getFollowing = asyncHandler(async (req, res) => {
//   const { userId: currentUserId } = req.user;
//   const { userId } = req.params; // Include username in the request params
//   const { username, page = 1, pageSize = 10 } = req.query;

//   const skipCount = (page - 1) * pageSize;

//   const matchStage = {
//     $match: {
//       followerId: new mongoose.Types.ObjectId(userId),
//     },
//   };

//   const usernameMatchStage = username
//     ? {
//         $lookup: {
//           from: "users",
//           let: { followeeId: "$followeeId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$_id", "$$followeeId"] },
//                     {
//                       $regexMatch: {
//                         input: "$username",
//                         regex: `^${username}`,
//                         options: "i",
//                       },
//                     },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "following",
//         },
//       }
//     : {
//         $lookup: {
//           from: "users",
//           localField: "followeeId",
//           foreignField: "_id",
//           as: "following",
//           pipeline: [
//             {
//               $lookup: {
//                 from: "follows",
//                 localField: "_id",
//                 foreignField: "followeeId",
//                 as: "follow",
//                 pipeline: [
//                   {
//                     $match: {
//                       followerId: new mongoose.Types.ObjectId(currentUserId),
//                     },
//                   },
//                 ],
//               },
//             },
//             {
//               $addFields: {
//                 isFollow: {
//                   $cond: {
//                     if: {
//                       $gte: [
//                         {
//                           $size: "$follow",
//                         },
//                         1,
//                       ],
//                     },
//                     then: true,
//                     else: false,
//                   },
//                 },
//               },
//             },

//             {
//               $project: {
//                 _id: 1,
//                 username: 1,
//                 name: 1,
//                 avatar: 1,
//                 isFollow: 1,
//                 follow: 1,
//               },
//             },
//           ],
//         },
//       };

//   const followings = await Follow.aggregate([
//     matchStage,
//     usernameMatchStage,
//     {
//       $unwind: "$following",
//     },
//     {
//       $project: {
//         _id: "$following._id",
//         username: "$following.username",
//         name: "$following.name",
//         avatar: "$following.avatar",
//         isFollow: "$following.isFollow",
//         follow: "$following.follow",
//       },
//     },
//     {
//       $addFields: {
//         isCurrentUser: {
//           $eq: ["$_id", new mongoose.Types.ObjectId(currentUserId)],
//         },
//       },
//     },
//     {
//       $sort: {
//         isCurrentUser: -1,
//         isFollow: -1,
//       },
//     },
//     {
//       $skip: skipCount,
//     },
//     {
//       $limit: pageSize,
//     },
//   ]);

//   return res
//     .status(200)
//     .json({ isSuccess: true, followings, hasMore: followings.length > 0 });
// });

// export const getAllFollowers = asyncHandler(async (req, res) => {
//   const follows = await Follow.find().populate("followerId followeeId");
//   return res.status(200).json({ follows });
// });
