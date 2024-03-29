import express from "express";
import { verifyToken } from "../middleware/index.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getAllFollowers,
  getFollowing,
} from "../controller/follow.controller.js";

const router = express.Router();

router.post("/follow/:followeeId", verifyToken, followUser);
router.delete("/unfollow/:followeeId", verifyToken, unfollowUser);
router.get("/followers/:userId", verifyToken, getFollowers);
router.get("/following/:userId", verifyToken, getFollowing);
/// admine routes
router.get("/admin/follows", getAllFollowers);

export default router;
