import mongoose from "mongoose";
import Bookmark from "../models/bookmark.modal.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getMongoosePaginationOptions } from "../utils/index.js";

const createBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const { userId } = req.user;

  const newBookmark = {
    bookmarkedBy: userId,
    postId,
  };

  if (!postId) {
    throw new ApiError(400, "Reference Id is missing");
  }

  const isBookmarked = await Bookmark.findOne(newBookmark);

  if (isBookmarked) {
    throw new ApiError(400, "Failed To Save");
  }

  const bookmark = await Bookmark.create(newBookmark);

  return res.status(200).json({
    bookmark: bookmark,
    isBookmaked: true,
  });
});

const deleteBookmark = asyncHandler(async (req, res) => {
  const { postId } = req.query;
  const { userId } = req.user;

  const newBookmark = {
    bookmarkedBy: userId,
  };

  if (!postId) {
    throw new ApiError(400, "Reference Id is missing");
  }

  if (postId) {
    newBookmark.postId = postId;
  }

  const deletedBookmark = await Bookmark.findOneAndDelete(newBookmark);

  res.status(200).json({
    deletedBookmark,
  });
});

const findAllBookmarkedbyUserId = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page } = req.query;
  const Id = new mongoose.Types.ObjectId(userId);
  const postAggregation = [
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
            $lookup: {
              from: "followrequests",
              localField: "_id",
              foreignField: "requestedTo",
              as: "isFollow",
              pipeline: [
                {
                  $match: {
                    requestedBy: Id,
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
  ];

  const bookmarks = Bookmark.aggregate([
    {
      $match: {
        bookmarkedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "postId",
        foreignField: "_id",
        as: "post",
        pipeline: postAggregation,
      },
    },
    {
      $unwind: "$post",
    },
    {
      $unwind: "$post",
    },
  ]);

  const paginatedPosts = await Bookmark.aggregatePaginate(
    bookmarks,
    getMongoosePaginationOptions({
      limit: 20,
      page: page,
      customLabels: { docs: "bookmarks" },
    })
  );
  console.log(paginatedPosts);

  return res.status(200).json(paginatedPosts);
});

export { createBookmark, deleteBookmark, findAllBookmarkedbyUserId };
