import express from "express";
import { verifyToken } from "../middleware/index.js";
import {
  deleteFollowRequest,
  getFollowRequestForUser,
  sendFollowRequest,
} from "../controller/followRequest.controller.js";

const router = express.Router();

router.post("/followRequest/:requestedTo", verifyToken, sendFollowRequest);
router.delete("/cancelFollow/:requestedTo", verifyToken, deleteFollowRequest);
router.get("/followRequests", verifyToken, getFollowRequestForUser);
// router.get("/following/:userId", verifyToken, getFollowing);
// router.get("/admin/follows", getAllFollowers);

export default router;
