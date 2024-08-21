import mongoose from "mongoose";
import { userSocketIDs } from "../socket.js";
import { myCustomLabels } from "./constant.js";

export function formatDateDifference(date) {
  const now = new Date();
  const timeDifference = now - date;

  if (timeDifference >= 604800000) {
    // More than a week (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const weeks = Math.floor(timeDifference / 604800000);
    return `${weeks}w`;
  } else if (timeDifference >= 86400000) {
    // More than a day
    const days = Math.floor(timeDifference / 86400000);
    return `${days}d`;
  } else if (timeDifference >= 3600000) {
    // More than an hour
    const hours = Math.floor(timeDifference / 3600000);
    return `${hours}h`;
  } else if (timeDifference >= 60000) {
    // More than a minute
    const minutes = Math.floor(timeDifference / 60000);
    return `${minutes}m`;
  } else {
    // Less than a minute
    const seconds = Math.floor(timeDifference / 1000);
    return `${seconds}s`;
  }
}

export const getObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};

export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIDs.get(user?.toString()));
  return sockets;
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const sockets = getSockets(users);

  io.to(sockets).emit(event, data);
};

export const getMongoosePaginationOptions = ({
  page = 1,
  limit = 10,
  customLabels,
}) => {
  return {
    page: Math.max(page, 1),
    limit: Math.max(limit, 1),
    pagination: true,
    customLabels: { ...myCustomLabels, ...customLabels },
  };
};


export const checkObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};