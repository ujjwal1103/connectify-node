import mongoose from "mongoose";
import Post from "../models/post.modal.js";
import User from "../models/user.modal.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteImage, uploadImage } from "../utils/uploadImage.js";
import asyncHandler from "./../utils/asyncHandler.js";

const postCommonAggregation = (req) => {
  return [
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "postId",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "isLiked",
        pipeline: [
          {
            $match: {
              likedBy: new mongoose.Types.ObjectId(req.user?.userId),
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "userId",
        as: "user",
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        likes: { $size: "$likes" },
        comments: { $size: "$comments" },
        isLiked: {
          $cond: {
            if: {
              $gte: [
                {
                  $size: "$isLiked",
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
  ];
};

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

  const posts = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(post._id),
      },
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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        isLiked: false,
        like: 0,
      },
    },
  ]);

  return res.status(200).json({
    post: posts[0],
    message: "post created successfully",
    isSuccess: true,
  });
});

// fetch all posts
export const fetchAllPosts = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const perPage = 3; // Number of posts per page
  const Id = new mongoose.Types.ObjectId(userId);
  const posts = await Post.aggregate([
    {
      $sort: { updatedAt: -1 },
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
              avatar: 1,
              isPrivate: 1,
            },
          },
          {
            $lookup: {
              from: "follows",
              localField: "_id",
              foreignField: "followeeId",
              as: "isFollow",
              pipeline: [
                {
                  $match: {
                    followerId: Id,
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
                        $size: "$isFollow",
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
            $addFields: {
              showPost: {
                $cond: {
                  if: {
                    $eq: ["$isFollow", "$isPrivate"],
                  },
                  then: true,
                  else: { $not: "$isPrivate" },
                },
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$user",
    },
    {
      $match: {
        $expr: {
          $eq: ["$user.showPost", true],
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "like",
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [Id, "$like.likedBy"],
        },
        like: { $size: "$like" },
      },
    },
    // {
    //   $match: {
    //     isLiked: false,
    //   },
    // },
    {
      $skip: (page - 1) * perPage,
    },
    {
      $limit: perPage,
    },
  ]);

  const totalPosts = await Post.countDocuments();
  const totalPages = Math.ceil(totalPosts / perPage);

  return res.status(200).json({
    posts,
    totalPages,
    currentPage: page,
    totalPosts,
    hasNext: page !== totalPages && posts.length > 0,
    isSuccess: true,
  });
});

export const fetchAllPostsByUser = async (req, res) => {
  const { userId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  const totalPosts = await Post.countDocuments({ userId });

  const skip = (page - 1) * limit;

  const paginationObject = {
    totalPosts,
    skip,
    hasNext: page * limit < totalPosts,
    totalPages: Math.ceil(totalPosts / limit),
    currentPage: parseInt(page),
  };

  const posts = await Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "like",
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(userId), "$like.likedBy"],
        },
        like: { $size: "$like" },
      },
    },
  ]);

  return res.status(200).json({ posts, isSuccess: true, ...paginationObject });
};

export const fetchAllPostsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userId: currUserId } = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  const allPosts = await Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $count: "totalPosts",
    },
  ]);

  const totalPosts = allPosts[0]?.totalPosts;
  const skip = (page - 1) * limit;

  const paginationObject = {
    totalPosts,
    skip,
    hasNext: page * limit < totalPosts,
    totalPages: Math.ceil(totalPosts / limit),
    currentPage: parseInt(page),
  };

  const posts = await Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "like",
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(currUserId), "$like.likedBy"],
        },
        like: { $size: "$like" },
      },
    },
  ]);

  return res.status(200).json({ posts, isSuccess: true, ...paginationObject });
});

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

export const getSinglePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const p = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
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
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: "$user",
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "postId",
        as: "like",
        pipeline: [
          {
            $count: "like",
          },
        ],
      },
    },
    {
      $addFields: {
        like: { $first: "$like" },
      },
    },
    {
      $addFields: {
        like: "$like.like",
      },
    },
    {
      $project: {
        user: 1,
        imageUrl: 1,
        like: 1,
        caption: 1,
        hashtags: 1,
        createdAt: 1,
      },
    },
  ]);

  if (p[0]) {
    return res.status(200).json({
      message: "post fetched successfully",
      post: p[0],
      isSuccess: true,
    });
  } else {
    return res.status(500).json({
      error: error,
      message: "Post not found",
      isSuccess: false,
    });
  }
});

/// admin controllers

export const getAllPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page number
  const perPage = parseInt(req.query.size) || 5;
  const username = req.query.username;

  let query = {};

  if (username) {
    // If username query parameter exists, create a query to search by username starting with the query string
    query = { username: { $regex: `^${username}`, $options: "i" } };
  }

  try {
    const totalPosts = await Post.aggregate([
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
          username: "$user.username",
        },
      },

      {
        $match: query,
      },
      {
        $count: "totalCount",
      },
    ]);

    const totalPostsCount =
      totalPosts.length > 0 ? totalPosts[0].totalCount : 0;

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
          avatar: "$user.avatar",
          createdAt: 1,
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
      totalPages: Math.ceil(totalPostsCount / perPage),
      totalPosts: totalPostsCount,
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
export const updatePostByIdAdmin = asyncHandler(async (req, res) => {
  const { postId: _id } = req.params;
  const { imageUrl, caption } = req.body;

  const p = await Post.findById(_id);

  if (!p) {
    throw new ApiError(400, "post does not exist");
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
    { _id },
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
