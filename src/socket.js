import { io } from "./app.js";

const users = new Set();

const findUser = (userId) => {
  const user = Array.from(users).find((u) => u._id === userId);

  return user;
};

const addOrUpdateUser = (user, socket) => {
  // Check if user with the same _id already exists
  const existingUser = Array.from(users).find((u) => u._id === user._id);

  if (existingUser) {
    users.delete(existingUser);
  }

  users.add({ ...user, socketId: socket.id });
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
      socket.on("addUser", (user) => {
        addOrUpdateUser(user, socket);
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
            socket.to(user?.socketId).emit("Receive Message", data.notification);
          
          }
        });


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
