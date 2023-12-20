// export default function deleteNotification(req, res){
//     try {

import Notification from "../models/notification.modal.js";

//     } catch (error) {

//     }
// }

// get all notifications of user

export const getAllNotifications = async (req, res) => {
  const { userId } = req.user;
  try {
    const notifications = await Notification.find({ userId })
      .sort({
        updatedAt: -1,
      })
      .populate("from postId");
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
