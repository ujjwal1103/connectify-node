import mongoose from "mongoose";
import Like from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notificationController.js";
import { emitEvent, getMongoosePaginationOptions } from "../utils/index.js";
import { COMMENT_POST, LIKE_COMMENT, LIKE_POST } from "../utils/constant.js";

const like = asyncHandler(async (req, res) => {
  const { postId, commentId, postUserId } = req.body;
  const { userId } = req.user;

  const newLike = {
    likedBy: userId,
  };

  if (!postId && !commentId && !postUserId) {
    throw new ApiError(400, "Reference Id is missing");
  }

  if (!commentId && postId) {
    newLike.postId = postId;
  }

  if (!postId && commentId) {
    newLike.commentId = commentId;
  }

  const isLiked = await Like.findOne(newLike);

  if (isLiked) {
    throw new ApiError(400, "Invalid Action");
  }

  const liked = await Like.create(newLike);

  if (postUserId !== userId) {
    const resp = await createNotification({
      from: userId,
      text: postId ? "Liked your post" : "Commented on your post",
      to: postUserId,
      type: postId ? LIKE_POST : LIKE_COMMENT,
      postId: postId,
      commentId: commentId,
    });
  }

  emitEvent(req, postId ? LIKE_POST : COMMENT_POST, [postUserId], liked);

  res.status(200).json({
    liked: liked,
    isLiked: true,
  });
});

const unlike = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.query;
  const { userId } = req.user;

  const newLike = {
    likedBy: userId,
  };

  if (!postId && !commentId) {
    throw new ApiError(400, "Reference Id is missing");
  }

  if (!commentId && postId) {
    newLike.postId = postId;
  }

  if (!postId && commentId) {
    newLike.commentId = commentId;
  }
  const deletedLike = await Like.findOneAndDelete(newLike);
  console.log(deletedLike, postId, commentId, newLike);

  res.status(200).json({
    liked: deletedLike,
    isUnLiked: true,
  });
});

const fetchlikes = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { postId } = req.params;

  const likes = await Like.aggregate([
    {
      $match: {
        postId: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $addFields: {
              isCurrentUser: {
                $eq: ["$_id", new mongoose.Types.ObjectId(userId)],
              },
            },
          },
          {
            $lookup: {
              from: "follows",
              localField: "_id",
              foreignField: "followeeId",
              as: "follow",
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
              avatar: 1,
              name: 1,
              likeId: 1,
              isFollow: 1,
              isCurrentUser: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: {
          $first: "$user",
        },
      },
    },
    {
      $sort: {
        "user.isCurrentUser": -1,
        "user.isFollow": -1,
        // Add other sort criteria if needed
      },
    },
    { $replaceRoot: { newRoot: "$user" } },
  ]);

  return res.status(200).json({ likes });
});

//admine

const fetchAllLikes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const likesAggregate = Like.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "likedBy",
      },
    },
    {
      $unwind: "$likedBy",
    },
  ]);
  const paginatedFollowers = await Like.aggregatePaginate(
    likesAggregate,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "likes" },
    })
  );
  return res.status(200).json(paginatedFollowers);
});

const deleteLikeById = asyncHandler(async (req, res) => {
  const likes = await Like.findByIdAndDelete(req.params.id);
  return res.status(200).json({ likes });
});

export { like, unlike, fetchlikes, fetchAllLikes, deleteLikeById };
