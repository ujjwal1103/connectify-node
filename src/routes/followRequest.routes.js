import express from "express";
import { verifyToken } from "../middleware/index.js";
import {
  acceptFollowRequest,
  deleteFollowRequest,
  getFollowRequestForUser,
  getSentFollowRequests,
  sendFollowRequest,
} from "../controller/followRequest.controller.js";

const router = express.Router();

router.post("/followRequest/:requestedTo", verifyToken, sendFollowRequest);
router.delete("/cancelFollow/:requestedTo", verifyToken, deleteFollowRequest);
router.get("/followRequests", verifyToken, getFollowRequestForUser);
router.patch("/accept/:requestId", verifyToken, acceptFollowRequest);
router.get("/sent-requests", verifyToken, getSentFollowRequests);

// router.get("/admin/follows", getAllFollowers);

export default router;
