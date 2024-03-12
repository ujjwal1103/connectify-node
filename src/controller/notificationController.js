import mongoose from "mongoose";
import Notification from "../models/notification.modal.js";
import { getObjectId } from "../utils/index.js";

export const getAllNotifications = async (req, res) => {
  const { userId } = req.user;
  const Id = getObjectId(userId);
  try {
    // const notifications = await Notification.find({ to: userId })
    //   .sort({
    //     updatedAt: -1,
    //   })
    //   .populate("from postId");

    const notifications = await Notification.aggregate([
      {
        $match: {
          to: Id,
        },
      },
      {
        $sort: {
          updatedAt: -1,
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
        $addFields: {
          from: {
            $first: "$from",
          },
        },
      },
    ]);
    return res.status(200).json({
      notifications: notifications,
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

export const deleteNotification = async (from, to) => {
  const res = await Notification.findOneAndDelete({ from, to });
};
