import express from "express";
import {
  registerUser,
  loginUser,
  getUser,
  getUsers,
  deleteUser,
  editUser,
  searchUsers,
  getUserByUsername,
  googleAuthentication,
  googleAuthenticate,
  getFriends,
  makeAccountPrivate,
  createUsers,
  createNewUser,
  getAllUsers,
  editNewUser,
  dashboardData,
  getUserByUsernameA,
  deleteUsersByIds,
  deleteUserById,
  getAllUsersIds,
  updateProfilePicture,
  removeProfilePicture,
  getSendUsers,
} from "../controller/userController.js";
import { upload, validateUsername, verifyToken } from "../middleware/index.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", verifyToken, getUser);
router.get("/user/:username", verifyToken, validateUsername, getUserByUsername);
router.get("/users", verifyToken, getUsers);
router.get("/friends", verifyToken, getFriends);
router.put("/user/privateAccount", verifyToken, makeAccountPrivate);
router.delete("/user", verifyToken, deleteUser);
router.put("/user/edit", verifyToken, upload.single("avatar"), editUser);
router.get("/users/search", verifyToken, searchUsers);
router.get("/users/send", verifyToken, getSendUsers);
router.get("/oauth/google", googleAuthentication);
router.get("/authenticate", googleAuthenticate);
router.get("/createUsers", createUsers);
router.patch(
  "/avatar",
  verifyToken,
  upload.single("avatar"),
  updateProfilePicture
);
router.delete("/avatar", verifyToken, removeProfilePicture);

// admin routes
//! get routes
router.get("/admin/users", getAllUsers);
router.get("/admin/usersIds", getAllUsersIds);
router.get("/admin/dashboard", dashboardData);
router.get("/admin/user/:username", getUserByUsernameA);

//! post routes
router.post("/admin/user", createNewUser);

//! put routes
router.put("/admin/editUser/:userId", editNewUser);

//! delete routes
router.delete("/admin/users", deleteUsersByIds);
router.delete("/admin/user", deleteUserById);

export default router;
