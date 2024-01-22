import mongoose from "mongoose";
import Like from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const like = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.body;
  const { userId } = req.user;

  const newLike = {
    likedBy: userId,
  };

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
  res.status(200).json({
    liked: liked,
    isLiked: true,
  });
});

const unlike = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.body;
  const { userId } = req.user;

  const newLike = {
    likedBy: userId,
  };
  if (!commentId && postId) {
    newLike.postId = postId;
  }

  if (!postId && commentId) {
    newLike.commentId = commentId;
  }

  const deletedLike = await Like.findOneAndDelete(newLike);

  res.status(200).json({
    liked: deletedLike,
    isUnLiked: true,
  });
});

const fetchlikes = asyncHandler(async (req, res) => {
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
            $project: {
              _id: 1,
              username: 1,
              profilePicture: 1,
              name: 1,
              likeId: 1,
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
    { $replaceRoot: { newRoot: "$user" } },
  ]);
  return res.status(200).json({ likes });
});

export { like, unlike, fetchlikes };
