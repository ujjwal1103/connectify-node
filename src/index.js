import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import {
  chatRouter,
  commentRouter,
  messageRouter,
  notificationRouter,
  postRouter,
  storyRouter,
  userRouter,
} from "./routes/index.js";
dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());
app.set("Connection", "keep-alive");

app.use("/api", userRouter);
app.use("/api", postRouter);
app.use("/api", storyRouter);
app.use("/api", notificationRouter);
app.use("/api", commentRouter);
app.use("/api", chatRouter);
app.use("/api", messageRouter);
app.all("/api/*", (req, res) => {
  console.log(req)
  res.status(404).json({ error: "Resource not found", isSuccess: false, pathname: req.pathname });
});

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then((x) => {
    console.log("db connection established");
  })
  .catch((e) => {
    console.log(e.message);
  });

app.listen("3100", "0.0.0.0", () => {
  console.log(`hey app is running !!`);
});
