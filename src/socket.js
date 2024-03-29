import { io } from "./app.js";

const users = new Set();

const findUser = (userId) => {
  const user = Array.from(users).find((u) => u.userId === userId);
  return user;
};

export const addOrUpdateUser = (user, socket) => {
  const existingUser = Array.from(users).find((u) => u.userId === user.userId);

  if (existingUser) {
    users.delete(existingUser);
  }

  users.add({ ...user, socketId: socket });
};

const deleteUser = (socketId) => {
  const userToDelete = Array.from(users).find((u) => u.socketId === socketId);
  if (userToDelete) {
    users.delete(userToDelete);
  }
};

export const runSocket = () => {
  try {
    io.on("connection", (socket) => {
      io.emit("allusers", Array.from(users));
      socket.on("Notification", (notify) => {
        if (notify) {
          const user = findUser(notify.to);
          socket.to(user?.socketId).emit("Receive", notify.notification);
        }
      });
      socket.on("Send Message", (data) => {
        if (data) {
          const user = findUser(data.to);
          console.log(user, "user we found to send this message");
          socket.to(user?.socketId).emit("Receive Message", data);
        }
      });

      socket.on("disconnect", () => {
        deleteUser(socket.id);
        io.emit("allusers", Array.from(users));
      });
    });
  } catch (error) {
    console.log(error);
  }
};
