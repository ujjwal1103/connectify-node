import Notification from "../models/notification.js";
import Post from "../models/post.js";
import User from "../models/userModal.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";

export const createPost = async (req, res) => {
  let { caption, imageUrl, hashtags = [] } = req.body;

  let hashtagMatches = caption.match(/#(\w+)/g);
  hashtags = hashtagMatches
    ? hashtagMatches.map((match) => match.replace("#", ""))
    : [];

  try {
    const currentDate = new Date();
    const url = await uploadImage(imageUrl, "posts", currentDate.toString());
    const newPost = {
      caption,
      imageUrl: url,
      hashtags,
      userId: req.user.userId,
    };
    let post = new Post(newPost);
    post = await post.save();

    const user = await User.findById(req.user.userId);
    user.posts.push(post._id);
    await user.save();

    return res.status(200).json({
      post: post,
      message: "post created successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};

// fetch all posts
export const fetchAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "-password -__v")
      .sort({ updatedAt: -1 });
    return res.status(200).json({
      posts: posts,
      message: "posts fetched successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};
// fetch all posts by user
export const fetchAllPostsByUser = async (req, res) => {
  const { userId } = req.user;

  try {
    const posts = await Post.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      posts: posts,
      message: "posts fetched successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};
// fetch all posts by username
export const fetchAllPostsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const posts = await Post.find({ userId })
      .sort({
        createdAt: -1,
      })
      .populate("userId", "username name _id profilePicture");

    return res.status(200).json({
      posts: posts,
      message: "posts fetched successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};

export const likePosts = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.user;

    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $inc: { likeCount: 1 }, $addToSet: { likedBy: userId } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({
      post: updatedPost,
      message: "post liked successfully",

      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};

export const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.user;

    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      {
        $inc: { likeCount: -1 }, // Decrement the likeCount field by 1
        $pull: { likedBy: userId }, // Remove userId from the likedBy array
      },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({
      post: updatedPost,
      message: "Post unliked successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};

export const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    const p = await Post.findById(postId);
    await Post.findByIdAndDelete(postId);
    await deleteImage(p.imageUrl);
    const { userId } = req.user;
    await User.findByIdAndUpdate(
      userId,
      { $pull: { posts: postId } }, // Remove postId from the user's posts array
      { new: true }
    );

    return res.status(200).json({
      message: "post deleted successfully",
      isSuccess: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};

export const getSinglePost = async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (post) {
      return res.status(200).json({
        message: "post fetched successfully",
        post: post,
        isSuccess: true,
      });
    } else {
      return res.status(500).json({
        error: error,
        message: "Post not found",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error,
      message: error.message || "Internal server error",
      isSuccess: false,
    });
  }
};
