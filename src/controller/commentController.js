import mongoose from "mongoose";
import Comment from "../models/comment.modal.js";
import asyncHandler from "../utils/asyncHandler.js";
import { emitEvent, getMongoosePaginationOptions } from "../utils/index.js";
import { NEW_COMMENT } from "../utils/constant.js";
import { createNotification } from "./notificationController.js";

let commentCommonAggregate = (userId) => [
  {
    $lookup: {
      from: "users",
      localField: "from",
      foreignField: "_id",
      as: "user",
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
    $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "parrentComment",
      as: "childComments",
    },
  },
  {
    $addFields: {
      user: { $first: "$user" },
    },
  },
  {
    $lookup: {
      from: "posts",
      localField: "post",
      foreignField: "_id",
      as: "post",
      pipeline: [
        {
          $project: {
            _id: 1,
            userId: 1,
          },
        },
      ],
    },
  },
  {
    $lookup: {
      from: "likes",
      localField: "_id",
      foreignField: "commentId",
      as: "like",
    },
  },
  {
    $addFields: {
      isLiked: {
        $in: [new mongoose.Types.ObjectId(userId), "$like.likedBy"],
      },
      like: { $size: "$like" },
    },
  },
  {
    $addFields: {
      post: { $first: "$post" },
    },
  },
];

export const getComments = async (req, res) => {
  const { post } = req.params;
  const { parrentCommentId = null } = req.query;
  const { userId } = req.user;
  try {
    const comments = await Comment.aggregate([
      {
        $match: {
          post: new mongoose.Types.ObjectId(post),
          parrentComment: parrentCommentId
            ? new mongoose.Types.ObjectId(parrentCommentId)
            : null,
        },
      },

      ...commentCommonAggregate(userId),
    ]);
    return res.status(200).json({
      comments,
      isSuccess: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};


export const addComment = async (req, res) => {
  const { userId: from } = req.user;
  const { comment, post, mentions, parrentComment } = req.body;

  try {
    const newComment = new Comment({
      from,
      comment,
      post,
      mentions,
      parrentComment,
    });
    const createdComment = await newComment.save();

    const comments = await Comment.aggregate([
      {
        $match: {
          _id: createdComment._id,
        },
      },
      ...commentCommonAggregate(from),
    ]);

    if (from !== comments[0]?.post?.userId) { 
      const resp = await createNotification({
        from: from,
        text: "Commented on your post",
        to: comments[0]?.post?.userId,
        type: NEW_COMMENT,
        postId: post, 
        commentId: comments[0]?.post?._id,
      });

      emitEvent(req, NEW_COMMENT, [comments[0]?.post?.userId], resp);
    }

    return res.status(201).json({
      comment: comments[0],
      isSuccess: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false, 
    });
  }
};

export const getAllComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const comments = Comment.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "from",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$user",
    },
  ]);

  const paginatedComments = await Comment.aggregatePaginate(
    comments,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "comments" },
    })
  );

  return res.status(200).json(paginatedComments);
});
