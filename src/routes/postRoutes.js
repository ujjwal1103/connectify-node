import express from "express";
const router = express.Router();
import { upload, verifyToken } from "../middleware/index.js";
import {
  createPost,
  fetchAllPosts,
  fetchAllPostsByUser,
  deletePost,
  fetchAllPostsByUserId,
  getSinglePost,
  getAllPosts,
  createPostByAdmin,
  updatePostByIdAdmin,
  deleteByIdAdmin,
  updatePost,
  fetchAllReelsByUser,
} from "../controller/postController.js";

router.post("/post", verifyToken, upload.array("postImage", 4), createPost);

router.get("/posts", verifyToken, fetchAllPosts);
router.get("/post/:postId", verifyToken, getSinglePost);
router.get("/posts/user", verifyToken, fetchAllPostsByUser);
router.get("/posts/reels/user", verifyToken, fetchAllReelsByUser);
router.get("/posts/:userId", verifyToken, fetchAllPostsByUserId);
router.delete("/post/:postId", verifyToken, deletePost);
router.patch("/post/:postId", verifyToken, updatePost);

// admin routes
router.get("/admin/posts", getAllPosts);
router.post("/admin/createPost/:userId", createPostByAdmin);
router.put("/admin/updatePost/:postId", updatePostByIdAdmin);
router.delete("/admin/post/:postId", deleteByIdAdmin);

export default router;
