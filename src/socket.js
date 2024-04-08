import { io } from "./app.js";
import { NEW_MESSAGE, SEEN_MESSAGES } from "./utils/constant.js";
import { getSockets } from "./utils/index.js";

const users = new Set();

export const userSocketIDs = new Map()
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
      const user = socket.user;
      userSocketIDs.set(user._id.toString(), socket.id);
     
      socket.on("Notification", (notify) => {
        if (notify) {
          const user = findUser(notify.to);
          socket.to(user?.socketId).emit("Receive", notify.notification);
        }
      });


      socket.on(NEW_MESSAGE, (data) => {
       
        if (data) {
          const sockets = getSockets([data.to]);
         
          io.to(sockets).emit(NEW_MESSAGE, data);
        }
      });
      
      socket.on(SEEN_MESSAGES, (data) => {
        if (data) {
          const sockets = getSockets([data.to]);
          console.log(data)
          io.to(sockets).emit(SEEN_MESSAGES, data);
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
