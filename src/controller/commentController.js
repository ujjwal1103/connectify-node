import Comment from "../models/comment.js";
import { formatDateDifference } from "../utils/index.js";

export const getComments = async (req, res) => {
  const { post } = req.params;
  try {
    const comments = await Comment.find({ post })
      .sort({
        updatedAt: -1,
      })
      .populate("from", "username profilePicture")
      .lean();

    const formattedComments = comments.map((comment) => {
      return {
        ...comment,
        createdAt: formatDateDifference(comment.createdAt),
        updatedAt: formatDateDifference(comment.updatedAt),
      };
    });
    return res.status(200).json({
      comments: formattedComments,
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
  const { comment, post } = req.body;

  try {
    const newComment = new Comment({
      from,
      comment,
      post,
    });
    const createdComment = await newComment.save();

    const c = await Comment.findOne(createdComment._id)
      .populate("from", "username profilePicture")
      .lean();

    return res.status(201).json({
      comment: {
        ...c,
        createdAt: formatDateDifference(c.createdAt),
        updatedAt: formatDateDifference(c.updatedAt),
      },
      isSuccess: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};
