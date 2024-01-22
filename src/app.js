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
} from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import asyncHandler from "./utils/asyncHandler.js";
import { verifyToken } from "./middleware/index.js";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";

dotenv.config({
  path: "./.env",
});
const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Rate limiter to avoid misuse of the service and avoid cost spikes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    return req.clientIp; // IP address from requestIp.mw(), as opposed to req.ip
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

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cors());
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

app.get(
  "/api/validetoken",
  verifyToken,
  asyncHandler((req, res) => {
    return res.status(200).json({ isValid: true });
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

export { httpServer };
