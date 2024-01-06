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
  getAllPosts,
  createPostByAdmin,
  fetchLikesByPostId,
  updatePostByAdmin,
  deleteByIdAdmin,
} from "../controller/postController.js";

router.post("/post", verifyToken, upload.single("postImage"), createPost);
router.get("/posts", verifyToken, fetchAllPosts);
router.get("/post/:postId", verifyToken, getSinglePost);
router.get("/users/posts", verifyToken, fetchAllPostsByUser);
router.get("/users/:userId", verifyToken, fetchAllPostsByUserId);
router.put("/like/:postId", verifyToken, likePosts);
router.put("/dislike/:postId", verifyToken, unlikePost);
router.delete("/post/:postId", verifyToken, deletePost);
router.get("/postLikes/:postId", verifyToken, fetchLikesByPostId);

// admin routes
router.get("/admin/posts", getAllPosts);
router.post("/admin/createPost/:userId", createPostByAdmin);
router.put("/admin/updatePost/:userId", updatePostByAdmin);
router.delete("/admin/post/:postId", deleteByIdAdmin);

export default router;
