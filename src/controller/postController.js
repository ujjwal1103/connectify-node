import mongoose from "mongoose";
import Post from "../models/post.modal.js";
import User from "../models/user.modal.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "./../utils/asyncHandler.js";
import {
  uploadMultipleOnCloudinary,
  deleteMultipleFromCloudinary,
} from "../utils/cloudinary.js";
import { getMongoosePaginationOptions } from "../utils/index.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.modal.js";
import Bookmark from "../models/bookmark.modal.js";

const getHashtags = (caption) => {
  let hashtagMatches;
  let hashtags;

  if (caption) {
    hashtagMatches = caption?.match(/#(\w+)/g);
    hashtags = hashtagMatches
      ? hashtagMatches.map((match) => match.replace("#", ""))
      : [];
  }

  return hashtags;
};

const likeAggregate = {
  $lookup: {
    from: "likes",
    localField: "_id",
    foreignField: "postId",
    as: "like",
  },
};



export const createReels = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let { caption, aspectRatio } = req.body;

  const hashtags = getHashtags(caption);

  if (!req.files.length) {
    throw new ApiError(404, "File is required");
  }

  const files = req.files.map((f) => ({
    path: f.path,
    isVideo: 'video',
    aspectRatio,
  }));

  const images = await uploadMultipleOnCloudinary(
    files,
    `${userId}/reels`
  );

  if (!images || images.length === 0) {
    throw new ApiError(404, "File is Required");
  }
  const newPost = {
    caption,
    images,
    hashtags,
    userId: userId,
    postType: "REEL",
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



export const createPost = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let { caption, aspectRatio, postType = 'POST' } = req.body;

  const hashtags = getHashtags(caption);

  if (!req.files.length) {
    throw new ApiError(404, "Image is required");
  }

  const files = req.files.map((f) => ({
    path: f.path,
    isVideo: f.mimetype.includes("video"),
    aspectRatio,
  }));

  const images = await uploadMultipleOnCloudinary(
    files,
    `${userId}/postImages`
  );

  if (!images || images.length === 0) {
    throw new ApiError(404, "Images are required");
  }
  const newPost = {
    caption,
    images,
    hashtags,
    userId: userId,
    postType
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
  const perPage = parseInt(req.query.limit) || 10;
  const Id = new mongoose.Types.ObjectId(userId);

  const postAggregation = [
    {
      $match: {
        postType: "POST",
      }
    },
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
          // {
          //   $lookup: {
          //     from: "followrequests",
          //     localField: "_id",
          //     foreignField: "requestedTo",
          //     as: "isFollow",
          //     pipeline: [
          //       {
          //         $match: {
          //           requestedBy: Id,
          //         },
          //       },
          //     ],
          //   },
          // },
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
              // isRequested: {
              //   $cond: {
              //     if: {
              //       $gte: [
              //         {
              //           $size: "$isRequested",
              //         },
              //         1,
              //       ],
              //     },
              //     then: true,
              //     else: false,
              //   },
              // },
            },
          },
          {
            $addFields: {
              showPost: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ["$_id", Id] }, // Logged-in user is the author
                      { $eq: ["$isFollow", "$isPrivate"] }, // Follower can see private posts
                    ],
                  },
                  then: true,
                  else: { $not: "$isPrivate" }, // Non-private posts are always visible
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
  ];

  const posts = Post.aggregate([
    ...postAggregation,
    likeAggregate,
    {
      $lookup: {
        from: "bookmarks",
        localField: "_id",
        foreignField: "postId",
        as: "bookmark",
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [Id, "$like.likedBy"],
        },
        isBookmarked: {
          $in: [Id, "$bookmark.bookmarkedBy"],
        },
        like: { $size: "$like" },
      },
    },
    {
      $sort: {
        isLiked: 1,
      },
    },
  ]);

  const paginatedPosts = await Post.aggregatePaginate(
    posts,
    getMongoosePaginationOptions({
      limit: perPage,
      page: page,
      customLabels: { docs: "posts" },
    })
  );

  return res.status(200).json({
    isSuccess: true,
    ...paginatedPosts,
  });
});

export const fetchAllPostsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const Id = new mongoose.Types.ObjectId(userId);
  const postsAggregate = Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        postType: "POST",
      },
    },
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
            },
          },
        ],
      },
    },
    likeAggregate,
    {
      $lookup: {
        from: "bookmarks",
        localField: "_id",
        foreignField: "postId",
        as: "bookmark",
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(userId), "$like.likedBy"],
        },
        isBookmarked: {
          $in: [Id, "$bookmark.bookmarkedBy"],
        },
        like: { $size: "$like" },
      },
    },
  ]);

  const postsPaginated = await Post.aggregatePaginate(
    postsAggregate,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "posts" },
    })
  );

  return res.status(200).json({ ...postsPaginated, isSuccess: true });
});

export const fetchAllReelsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const Id = new mongoose.Types.ObjectId(userId);
  const postsAggregate = Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        postType: "REEL",
      },
    },
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
            },
          },
        ],
      },
    },
    likeAggregate,
    {
      $lookup: {
        from: "bookmarks",
        localField: "_id",
        foreignField: "postId",
        as: "bookmark",
      },
    },
    {
      $addFields: {
        user: { $first: "$user" },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(userId), "$like.likedBy"],
        },
        isBookmarked: {
          $in: [Id, "$bookmark.bookmarkedBy"],
        },
        like: { $size: "$like" },
      },
    },
  ]);

  const postsPaginated = await Post.aggregatePaginate(
    postsAggregate,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "posts" },
    })
  );

  return res.status(200).json({ ...postsPaginated, isSuccess: true });
});

export const fetchAllPostsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userId: currUserId } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;

  const postsAggregate = Post.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        postType: "POST",
      },
    },
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
            },
          },
        ],
      },
    },
    likeAggregate,
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

  const postsPaginated = await Post.aggregatePaginate(
    postsAggregate,
    getMongoosePaginationOptions({
      limit,
      page,
      customLabels: { docs: "posts" },
    })
  );

  return res.status(200).json({ ...postsPaginated, isSuccess: true });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "INVALIDE POST ID");
  }
  const publicIds = post.images.map((i) => i.publicId);
  await deleteMultipleFromCloudinary(publicIds);
  await Post.findByIdAndDelete(postId);
  await Like.deleteMany({ postId });
  await Comment.deleteMany({ postId });
  await Bookmark.deleteMany({ postId });
  return res.status(200).json({
    message: "Post deleted successfully",
    isSuccess: true,
  });
});

export const getSinglePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;
  const Id = new mongoose.Types.ObjectId(userId);
  const p = await Post.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(postId) },
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
        ],
      },
    },
    {
      $unwind: "$user",
    },
    likeAggregate,
    {
      $lookup: {
        from: "bookmarks",
        localField: "_id",
        foreignField: "postId",
        as: "bookmark",
        pipeline: [
          {
            $match: {
              postId: new mongoose.Types.ObjectId(postId),
              bookmarkedBy: Id,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [Id, "$like.likedBy"],
        },
        isBookmarked: {
          $in: [Id, "$bookmark.bookmarkedBy"],
        },
        like: { $size: "$like" },
      },
    },
    {
      $project: {
        userId: 0,
        bookmark: 0,
        __v: 0,
      },
    },
  ]);

  if (!p[0]) {
    throw new ApiError(400, "Post Not found");
  }

  return res.status(200).json({
    message: "post fetched successfully",
    post: p[0],
    isSuccess: true,
  });
});

export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;

  const { caption } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  let post = await Post.findOne({ _id: postId, userId: userId });

  console.log(JSON.stringify(post, null, "  "));

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const hashtags = getHashtags(caption);

  post = await Post.findOneAndUpdate(
    { _id: postId },
    {
      $set: {
        caption: caption,
        hashtags: hashtags,
      },
    },
    {
      new: true,
    }
  );

  res.status(200).json({
    post: post,
    message: "Post updated successfully",
    isSuccess: true,
  });
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
          images: 1,
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
  const hashtags = getHashtags(caption);

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
