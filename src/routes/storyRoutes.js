import express from "express";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";
import { createStory, getstories } from "../controller/storyController.js";

router.post("/story", verifyToken, createStory);
router.get("/stories", verifyToken, getstories);

export default router;
