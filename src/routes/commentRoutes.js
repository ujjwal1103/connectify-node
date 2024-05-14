import express from "express";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";
import { getComments, addComment } from "../controller/commentController.js";

router.get("/comments/:post",verifyToken, getComments);
router.post("/comment", verifyToken, addComment);

export default router;
