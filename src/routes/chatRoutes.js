import express from "express";
import {
  createChat,
  getAllChats,
  getChatById,
  deleteChatById,
  chatUsers,
  createGroup,
  updateGroup,
  removeGroupMember,
  addGroupMembers,
  removeGroupAvatar,
} from "../controller/chatController.js";
const router = express.Router();
import { upload, verifyToken } from "../middleware/index.js";

router.post("/chat", verifyToken, createChat);
router.post("/chat/group", verifyToken, upload.single("avatar"), createGroup);
router.get("/chats", verifyToken, getAllChats);
router.get("/chat/:chatId", verifyToken, getChatById);
router.get("/newchat/users", verifyToken, chatUsers);
router.delete("/chat/:chatId", verifyToken, deleteChatById);
router.patch("/chat/:chatId/group", verifyToken, upload.single("avatar"),updateGroup);
router.patch("/chat/:chatId/newMembers", verifyToken,addGroupMembers);
router.patch("/chat/:chatId/removeMember", verifyToken,removeGroupMember);
router.patch("/chat/:chatId/removeGroupAvatar", verifyToken,removeGroupAvatar);

// Chat related routes
// router.post("/chats", verifyToken, createChat); // Create new chat
// router.get("/chats", verifyToken, getAllChats); // Get all chats
// router.get("/chats/:chatId", verifyToken, getChatById); // Get specific chat by ID
// router.delete("/chats/:chatId", verifyToken, deleteChatById); // Delete chat by ID

// // Group related routes
// router.post("/groups", verifyToken, upload.single("avatar"), createGroup); // Create a new group
// router.patch("/groups/:groupId", verifyToken, upload.single("avatar"), updateGroup); // Update group details (name, avatar, etc.)
// router.patch("/groups/:groupId/avatar/remove", verifyToken, removeGroupAvatar); // Remove group avatar
// router.patch("/groups/:groupId/members", verifyToken, addGroupMembers); // Add members to the group
// router.patch("/groups/:groupId/members/remove", verifyToken, removeGroupMember); // Remove member from the group

export default router;
