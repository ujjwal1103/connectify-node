import mongoose from "mongoose";
import Comment from "../models/comment.modal.js";
let commentCommonAggregate = (post, parrentCommentId, userId)=> [
  {
    $match: {
      post: new mongoose.Types.ObjectId(post),
      parrentComment: parrentCommentId
        ? new mongoose.Types.ObjectId(parrentCommentId)
        : null,
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
]

export const getComments = async (req, res) => {
  const { post } = req.params;
  const {parrentCommentId = null} = req.query;
  const { userId } = req.user;
  try {
    const comments = await Comment.aggregate(commentCommonAggregate(post, parrentCommentId, userId));
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

// add new notifications
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


    const comments = await Comment.aggregate(commentCommonAggregate(post, parrentComment, from))

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
