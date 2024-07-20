import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import logger from "./logger.js";
import morgan from "morgan";
import {
  chatRouter,
  commentRouter,
  messageRouter,
  notificationRouter,
  postRouter,
  storyRouter,
  userRouter,
  followRouter,
  likeRouter,
  uploadRouter,
  followRequestRouter,
  bookmarkRouter,
} from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import asyncHandler from "./utils/asyncHandler.js";
import { verifyToken } from "./middleware/index.js";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import User from "./models/user.modal.js";
import { userSocketIDs } from "./socket.js";

dotenv.config({
  path: "./.env",
});
const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT,
  },
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _) => {
    return req.clientIp;
  },
  handler: (_, __, ___, options) => {
    throw new ApiError(
      options.statusCode || 500,
      `There are too many requests. You are only allowed ${
        options.max
      } requests per ${options.windowMs / 60000} minutes`
    );
  },
});

const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

app.use(limiter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.set("Connection", "keep-alive");
app.set("io", io);
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api", userRouter);
app.use("/api", postRouter);
app.use("/api", storyRouter);
app.use("/api", notificationRouter);
app.use("/api", commentRouter);
app.use("/api", chatRouter);
app.use("/api", messageRouter);
app.use("/api", followRouter);
app.use("/api", likeRouter);
app.use("/api", bookmarkRouter);
app.use("/api", uploadRouter);
app.use("/api", followRequestRouter);

app.get(
  "/api/validtoken",
  verifyToken,
  asyncHandler((req, res) => {
    return res.status(200).json({ isValid: true });
  })
);

app.get(
  "/api/healthCheck",
  asyncHandler((req, res) => {
    const date = new Date();
    return res.status(200).json({ success: true, date: new Date() });
  })
);

app.get(
  "/api/isOnline/:userId",
  asyncHandler((req, res) => {
    const { userId } = req.params;
    console.log(userSocketIDs);
    const isOnline = !!userSocketIDs.get(userId);
    console.log(isOnline);
    return res
      .status(200)
      .json({ success: true, isOnline, user: userSocketIDs.get(userId) });
  })
);

app.all(
  "/api/*",
  asyncHandler((req, res) => {
    throw new ApiError(404, "Resource not found");
  })
);

app.get("", (_, res) => {
  const htmlContent = `
  <html>
  <head>
    <title>connectify</title>
  </head>
  <body style="display: flex;background-color: #0e0e0e; justify-content: center; align-items: center; height: 100vh;">
    <div style="text-align: center;">
      <h1 style="color: #fefefe">Welcome To Connectify</h1>
      <a href="${process.env.CLIENT}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">START NOW</a>
    </div>
  </body>
  </html>
  `;
  res.send(htmlContent);
});

io.use(async (socket, next) => {
  if (socket.handshake.auth?.userId) {
    const user = await User.findById(socket.handshake.auth?.userId).select(
      "username _id avatar"
    );
    socket.user = user;
    next();
  }
});

export { httpServer };
