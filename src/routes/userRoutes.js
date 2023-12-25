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
  googleAuthentication,
  googleAuthenticate,
  getFriends,
  unfollowUser,
  makeAccountPrivate,
  createUsers,
  createNewUser,
  getAllUsers,
  editNewUser,
} from "../controller/userController.js";
import { upload, validateUsername, verifyToken } from "../middleware/index.js";
const router = express.Router();

// G{}ye

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", verifyToken, getUser);
router.get("/user/:username", verifyToken, validateUsername, getUserByUsername);
router.get("/users", verifyToken, getUsers);
router.get("/friends", verifyToken, getFriends);
router.put("/sendFriendReq", verifyToken, sendFriendRequest);
router.put("/unfollow/:friendId", verifyToken, unfollowUser);
router.put("/user/privateAccount", verifyToken, makeAccountPrivate);
router.delete("/user", verifyToken, deleteUser);
router.put("/user/edit", verifyToken, upload.single("image"), editUser);
router.get("/users/search", verifyToken, searchUsers);
router.get("/user/followers/:userId", verifyToken, getFollowers);
router.get("/user/following/:userId", verifyToken, getFollowing);
router.get("/oauth/google", googleAuthentication);
router.get("/authenticate", googleAuthenticate);
router.get("/createUsers", createUsers);

// admin routes
router.get("/admin/users", getAllUsers);
router.post("/admin/users", createNewUser);
router.put("/admin/editUser/:userId", editNewUser);

export default router;
