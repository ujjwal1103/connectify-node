import express from "express";
import { verifyToken } from "../middleware/index.js";
import {
  createBookmark,
  deleteBookmark,
  findAllBookmarkedbyUserId,
} from "../controller/bookmark.controller.js";

const router = express.Router();

router.post("/bookmark", verifyToken, createBookmark);
router.delete("/bookmark", verifyToken, deleteBookmark);
router.get("/bookmarks", verifyToken, findAllBookmarkedbyUserId);


export default router;
