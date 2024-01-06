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
} from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import asyncHandler from "./utils/asyncHandler.js";
import { verifyToken } from "./middleware/index.js";

dotenv.config({
  path: "./.env",
});
const app = express();
const httpServer = createServer(app);

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
