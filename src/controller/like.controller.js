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

const fetchAllLikes = asyncHandler(async(req, res)=>{
  const likes = await Like.find().populate('likedBy')
  return res.status(200).json({ likes });
})

export { like, unlike, fetchlikes, fetchAllLikes };
