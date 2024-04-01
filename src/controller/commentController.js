import Comment from "../models/comment.modal.js";

export const getComments = async (req, res) => {
  const { post } = req.params;
  try {
    const comments = await Comment.find({ post })
      .sort({
        updatedAt: -1,
      })
      .populate("from", "username avatar")
      .lean();

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
  const { comment, post, mentions } = req.body;

  try {
    const newComment = new Comment({
      from,
      comment,
      post,
      mentions,
    });
    const createdComment = await newComment.save();

    const c = await Comment.findOne(createdComment._id)
      .populate("from", "username avatar")
      .lean();

    return res.status(201).json({
      comment: c,
      isSuccess: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};
