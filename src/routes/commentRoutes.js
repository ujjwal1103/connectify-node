import express from "express";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";
import {
  getComments,
  addComment,
  getAllComments,
} from "../controller/commentController.js";

router.get("/comments/:post", verifyToken, getComments);
router.post("/comment", verifyToken, addComment);
router.get("/admin/comments", getAllComments);

export default router;
