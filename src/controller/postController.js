import mongoose from "mongoose";
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
  const page = parseInt(req.query.page) || 1;
  const perPage = 10; // Number of posts per page

  try {
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    const posts = await Post.aggregate([
      {
        $sort: { updatedAt: -1 },
      },
      {
        $skip: (page - 1) * perPage,
      },
      {
        $limit: perPage,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                username: 1,
                name: 1,
                profilePicture: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          user: { $first: "$user" },
          isLiked: { $in: [new mongoose.Types.ObjectId(userId), "$likedBy"] },
        },
      },
    ]);

    return res.status(200).json({
      posts,
      totalPages: totalPages,
      currentPage: page,
      message: "Posts fetched successfully",
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

export const fetchLikesByPostId = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const likes = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $unwind: "$likedBy",
    },
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        likedBy: {
          _id: "$user._id",
          username: "$user.username",
          profilePicture: "$user.profilePicture",
        },
      },
    },
    {
      $group: {
        _id: null,
        likedBy: {
          $push: {
            _id: "$likedBy._id",
            username: "$likedBy.username",
            profilePicture: "$likedBy.profilePicture",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        likedBy: 1,
      },
    },
  ]);

  return res.status(200).json({ likes: likes[0].likedBy });
});

/// admin controllers

// export const getAllPosts = async (req, res) => {
//   const page = parseInt(req.query.page) || 1; // Current page number
//   const perPage = parseInt(req.query.size) || 10; // Number of posts per page
//   try {
//     const totalPosts = await Post.countDocuments();
//     let posts = await Post.find()
//       .populate("userId", "username name _id profilePicture")
//       .sort({ updatedAt: -1 })
//       .skip((page - 1) * perPage) // Calculate the number of posts to skip
//       .limit(perPage) // Limit the number of posts per page
//       .lean();

//     return res.status(200).json({
//       posts: posts,
//       currentPage: page,
//       totalPages: Math.ceil(totalPosts / perPage),
//       totalPosts: totalPosts,
//       message: "Posts fetched successfully",
//       isSuccess: true,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       error: error,
//       message: error.message || "Internal server error",
//       isSuccess: false,
//     });
//   }
// };

export const getAllPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page number
  const perPage = parseInt(req.query.size) || 10;
  const username = req.query.username;
  // Number of posts per page
  let query = {}; // Default empty query object

  if (username) {
    // If username query parameter exists, create a query to search by username starting with the query string
    query = { username: { $regex: `^${username}`, $options: "i" } };
  }
  console.log(query);
  try {
    const posts = await Post.aggregate([
      {
        $sort: { updatedAt: -1 },
      },
      {
        $lookup: {
          from: "users", // Change to the appropriate collection name for users
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,

          userId: "$user._id",
          username: "$user.username",
          name: "$user.name",
          profilePicture: "$user.profilePicture",
          updatedAt: 1,
          imageUrl: 1,
          caption: 1,
          hashtags: 1,
        },
      },
      {
        $match: query,
      },
      {
        $skip: (page - 1) * perPage,
      },
      {
        $limit: perPage,
      },
    ]);

    return res.status(200).json({
      posts: posts,
      currentPage: page,
      totalPages: Math.ceil(posts.length / perPage),
      totalPosts: posts.length,
      message: "Posts fetched successfully",
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

export const createPostByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { imageUrl, caption } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "user does not exist");
  }

  if (!imageUrl) {
    throw new ApiError(400, "Image Url is required");
  }

  let hashtagMatches;
  let hashtags;

  if (caption) {
    hashtagMatches = caption?.match(/#(\w+)/g);
    hashtags = hashtagMatches
      ? hashtagMatches.map((match) => match.replace("#", ""))
      : [];
  }

  const newPost = {
    caption,
    imageUrl,
    hashtags,
    userId: userId,
  };
  let post = new Post(newPost);
  post = await post.save();

  return res.status(200).json({
    post: post,
    message: "post created successfully",
    isSuccess: true,
  });
});
export const updatePostByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { imageUrl, caption } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "user does not exist");
  }

  if (!imageUrl) {
    throw new ApiError(400, "Image Url is required");
  }

  let hashtagMatches;
  let hashtags;

  if (caption) {
    hashtagMatches = caption?.match(/#(\w+)/g);
    hashtags = hashtagMatches
      ? hashtagMatches.map((match) => match.replace("#", ""))
      : [];
  }

  const post = await Post.findOneAndUpdate(
    { userId: userId },
    {
      $set: {
        imageUrl: [...imageUrl],
        caption: caption,
        hashtags: hashtags,
      },
    },
    {
      new: true,
    }
  );

  return res.status(200).json({
    post: post,
    message: "post created successfully",
    isSuccess: true,
  });
});

export const deleteByIdAdmin = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  await Post.findByIdAndDelete(postId);
  return res.status(200).json({
    message: "post deleted successfully",
    isSuccess: true,
  });
});
