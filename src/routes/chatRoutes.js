import express from "express";
import {
  createChat,
  getAllChats,
  getChatById,
  deleteChatById,
  chatUsers,
  createGroup,
  updateGroupName,
} from "../controller/chatController.js";
const router = express.Router();
import { upload, verifyToken } from "../middleware/index.js";

router.post("/chat", verifyToken, createChat);
router.post("/chat/group", verifyToken, upload.single("avatar"), createGroup);
router.get("/chats", verifyToken, getAllChats);
router.get("/chat/:chatId", verifyToken, getChatById);
router.get("/newchat/users", verifyToken, chatUsers);
router.delete("/chat/:chatId", verifyToken, deleteChatById);
router.patch("/chat/:chatId/groupname", verifyToken, updateGroupName);

export default router;
