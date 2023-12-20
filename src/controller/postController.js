import Post from "../models/post.modal.js";
import User from "../models/user.modal.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";
import asyncHandler from "./../utils/asyncHandler.js";

export const createPost = asyncHandler(async (req, res) => {
  let { caption } = req.body;

  let hashtagMatches;
  let hashtags;

  if (caption) {
    hashtagMatches = caption?.match(/#(\w+)/g);
    hashtags = hashtagMatches
      ? hashtagMatches.map((match) => match.replace("#", ""))
      : [];
  }

  if (!req.file) {
    throw new ApiError(404, "Image is required");
  }

  const imageUrl = await uploadImage(req.file.originalname, "posts");
  const newPost = {
    caption,
    imageUrl,
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
});

// fetch all posts
export const fetchAllPosts = async (req, res) => {
  const { userId } = req.user;

 try {
    let posts = await Post.find()
      .populate("userId", "username name _id profilePicture")
      .sort({ updatedAt: -1 })
      .lean();

    posts = posts.map((post) => {
      if (post.likedBy?.some((id) => id.toString() === userId)) {
        return { ...post, isLiked: true };
      } else {
        return { ...post, isLiked: false };
      }
    });

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

export const fetchAllPostsByUser = async (req, res) => {
  const { userId } = req.user;

  try {
    let posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "username name _id profilePicture")
      .lean();

    posts = posts.map((post) => {
      if (post.likedBy?.some((id) => id.toString() === userId)) {
        return { ...post, isLiked: true };
      } else {
        return { ...post, isLiked: false };
      }
    });

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
    let posts = await Post.find({ userId })
      .sort({
        createdAt: -1,
      })
      .populate("userId", "username name _id profilePicture")
      .lean();

    posts = posts.map((post) => {
      if (post.likedBy?.some((id) => id.toString() === userId)) {
        return { ...post, isLiked: true };
      } else {
        return { ...post, isLiked: false };
      }
    });

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
    const post = await Post.findById(postId)
      .populate("userId", "username name _id profilePicture")
      .lean();
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
