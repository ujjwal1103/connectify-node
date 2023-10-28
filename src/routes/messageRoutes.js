import express from "express";
import { verifyToken } from "../middleware/index.js";
import {
  deleteMessage,
  getMessagesInChat,
  markAllMessagesAsSeen,
  sendMessage,
} from "../controller/messageController.js";
const router = express.Router();

router.get("/messages/:chat", verifyToken, getMessagesInChat);
router.post("/message/:chat", verifyToken, sendMessage);
router.put("/seen-message/:chatId", verifyToken, markAllMessagesAsSeen);
router.delete("message/:messageId", verifyToken, deleteMessage);

export default router;
