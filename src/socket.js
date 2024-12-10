import { io } from "./index.js";
import Message from "./models/message.modal.js";
import { SEEN_MESSAGES } from "./utils/constant.js";
import { getSockets } from "./utils/index.js";

export const userSocketIDs = new Map();


export const runSocket = () => {
  try {
    io.on("connection", (socket) => {
      const user = socket.user;
      if (userSocketIDs.has(user?._id?.toString())) {
        console.log('already connected')
      }
      userSocketIDs.set(user?._id?.toString(), socket.id);
      console.log(userSocketIDs, user.username, 'connected')
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
          Message.findByIdAndUpdate(data.message, { seen: true })
        }
      });

      socket.on("disconnect", (t) => {
        userSocketIDs.delete(socket.id)
      });
    });
  } catch (error) {
    console.log(error);
  }
};
