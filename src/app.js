import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
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
} from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import asyncHandler from "./utils/asyncHandler.js";
import { verifyToken } from "./middleware/index.js";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import { addOrUpdateUser } from "./socket.js";

dotenv.config({
  path: "./.env",
});
const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    credentials: true,
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
app.use("/api", uploadRouter);

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

io.use((socket, next) => {
  console.log(socket.handshake);
  const user = JSON.parse(socket.handshake.query.user);

  if (user?._id && socket.id) {
    addOrUpdateUser(user, socket.id);
    next();
  }
});

export { httpServer };
