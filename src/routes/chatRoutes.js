import express from "express";
import { createChat, getAllChats, getChatById, deleteChatById,chatUsers } from "../controller/chatController.js";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";

router.post("/chat", verifyToken, createChat);
router.get("/chats", verifyToken, getAllChats);
router.get("/chat/:chatId", verifyToken, getChatById);
router.get("/newchat/users", verifyToken, chatUsers);
router.delete("/chat/:chatId", verifyToken, deleteChatById);

export default router;
