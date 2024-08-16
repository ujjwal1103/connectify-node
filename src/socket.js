import { io } from "./app.js";
import { SEEN_MESSAGES } from "./utils/constant.js";
import { getSockets } from "./utils/index.js";

export const userSocketIDs = new Map();


export const runSocket = () => {
  try {
    io.on("connection", (socket) => {
      const user = socket.user;
      userSocketIDs.set(user?._id?.toString(), socket.id);
      console.log("user connected", user?.username, socket.id);
      console.log(userSocketIDs);
      socket.on("Notification", (notify) => {
        if (notify) {
          const user = findUser(notify.to);
          socket.to(user?.socketId).emit("Receive", notify.notification);
        }
      });

      socket.on(SEEN_MESSAGES, (data) => {
        if (data) {
          const sockets = getSockets([data.to]);
          io.to(sockets).emit(SEEN_MESSAGES, data);
        }
      });

      socket.on("disconnect", (t) => {
        console.log("socket disconnected", t, socket.id);
        userSocketIDs.delete(socket.id)

      });
    });
  } catch (error) {
    console.log(error);
  }
};
