import express from "express";
import { verifyToken } from "../middleware/index.js";
import { like, unlike, fetchlikes, fetchAllLikes } from "../controller/like.controller.js";

const router = express.Router();

router.post("/like", verifyToken, like);
router.delete("/unlike", verifyToken, unlike);
router.get("/likes/:postId", verifyToken, fetchlikes);


//admin routes
router.get("/admin/likes", fetchAllLikes);

export default router;
