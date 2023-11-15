import express from "express";
const router = express.Router();
import { upload, verifyToken } from "../middleware/index.js";
import {
  createPost,
  fetchAllPosts,
  fetchAllPostsByUser,
  likePosts,
  deletePost,
  unlikePost,
  fetchAllPostsByUserId,
  getSinglePost,
} from "../controller/postController.js";

router.post("/post", verifyToken, upload.single("imageUrl"), createPost);
router.get("/posts", verifyToken, fetchAllPosts);
router.get("/post/:postId", verifyToken, getSinglePost);
router.get("/users/posts", verifyToken, fetchAllPostsByUser);
router.get("/users/:userId", verifyToken, fetchAllPostsByUserId);
router.put("/like/:postId", verifyToken, likePosts);
router.put("/dislike/:postId", verifyToken, unlikePost);
router.delete("/post/:postId", verifyToken, deletePost);

export default router;
