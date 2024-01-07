import express from "express";
import { verifyToken } from "../middleware/index.js";
import { likeDislikePost } from "../controller/like.controller.js";

const router = express.Router();

router.post("/post/:postId", verifyToken, likeDislikePost);
