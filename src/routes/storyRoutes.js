import express from "express";
const router = express.Router();
import { upload, verifyToken } from "../middleware/index.js";
import {
  createStory,
  getstories,
  deleteStory,
} from "../controller/storyController.js";

router.post("/story", verifyToken, upload.single("story"), createStory);
router.get("/stories", verifyToken, getstories);
router.delete("/story/:storyId", verifyToken, deleteStory);

export default router;
