import express from "express";
import { createChat, getAllChats, getChatById, deleteChatById } from "../controller/chatController.js";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";

router.post("/chat", verifyToken, createChat);
router.get("/chats", verifyToken, getAllChats);
router.get("/chat/:chatId", verifyToken, getChatById);
router.delete("/chat/:chatId", verifyToken, deleteChatById);

export default router;
