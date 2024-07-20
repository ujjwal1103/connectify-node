import mongoose from "mongoose";
import Notification from "../models/notification.modal.js";
import { getObjectId } from "../utils/index.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getAllNotifications = async (req, res) => {
  const { userId } = req.user;
  const Id = getObjectId(userId);
  const limit = 30;
  try {
    const unSeenNotifications = await Notification.aggregate([
      {
        $match: {
          to: Id,
          seen: false,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
    ]);

    const idsOnly = unSeenNotifications.map((notification) => notification._id);

    // Update seen field of unseen notifications to true
    await Notification.updateMany(
      {
        _id: { $in: idsOnly },
      },
      {
        $set: {
          seen: true,
        },
      }
    );

    const notifications = await Notification.aggregate([
      {
        $match: {
          to: Id,
        },
      },
      {
        $limit: limit,
      },
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
          as: "from",
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
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
                  $in: [Id, "$isFollow.followerId"],
                },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "postId",
          pipeline: [
            {
              $project: {
                images: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          from: {
            $first: "$from",
          },
          postId: {
            $first: "$postId",
          },
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          notifications: {
            $push: {
              _id: "$_id",
              type: "$type",
              createdAt: "$createdAt",
              isRead: "$isRead",
              user: "$from",
              postId: "$postId",
            },
          },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ]);

    console.log(notifications);

    return res.status(200).json({
      data: notifications,
      isSuccess: true,
      idsOnly,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};

// add new notifications

export const addNotifications = async (req, res) => {
  const { userId } = req.user;
  const { content, to, notificationType, postId } = req.body;

  try {
    const newNotification = new Notification({
      from: userId,
      content,
      userId: to,
      notificationType,
      postId,
    });
    await newNotification.save();

    return res.status(201).json({
      notification: newNotification,
      isSuccess: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      isSuccess: false,
    });
  }
};

export const createNotification = async ({
  from,
  to,
  text,
  type,
  postId = null,
  commentId = null,
  requestId = null,
  followId = null,
}) => {
  const newNotification = new Notification({
    from,
    text,
    to,
    type,
    postId,
    commentId,
    requestId,
    followId,
  });
  return await newNotification.save();
};

export const getUnseenNotificationCount = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const Id = getObjectId(userId);
  const notificationCount = await Notification.aggregate([
    {
      $match: {
        to: Id,
        seen: false,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
    {
      $count: "notificationCount",
    },
  ]);

  return res.status(200).json({
    notifications: notificationCount[0]?.notificationCount || 0,
    isSuccess: true,
  });
});

export const deleteNotification = async (from, to) => {
  const res = await Notification.findOneAndDelete({ from, to });
};

export const deleteNotificationById = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.notificationId });
  return res.json({ message: "notification deleted Successfully" });
});
