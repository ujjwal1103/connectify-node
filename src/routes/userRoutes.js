import express from "express";
import {
  registerUser,
  loginUser,
  getUser,
  getUsers,
  sendFriendRequest,
  deleteUser,
  editUser,
  searchUsers,
  getUserByUsername,
  getFollowers,
  getFollowing,
} from "../controller/userController.js";
import { validateUsernamePassword, verifyToken } from "../middleware/index.js";
const router = express.Router();

// register router

router.post("/register", validateUsernamePassword, registerUser);
router.post("/login", validateUsernamePassword, loginUser);
router.get("/user", verifyToken, getUser);
router.get("/user/:username", verifyToken, getUserByUsername);
router.get("/users", verifyToken, getUsers);
router.put("/sendFriendReq", verifyToken, sendFriendRequest);
router.delete("/user", verifyToken, deleteUser);
router.put("/user/edit", verifyToken, editUser);
router.get("/users/search", verifyToken, searchUsers);
router.get("/user/followers/:userId", getFollowers);
router.get("/user/following/:userId", getFollowing);

export default router;
