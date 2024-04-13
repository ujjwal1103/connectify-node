import express from "express";
import { upload, verifyToken } from "../middleware/index.js";
import {
  deleteMessage,
  getMessagesInChat,
  markAllMessagesAsSeen,
  sendAttachments,
  sendMessage,
} from "../controller/messageController.js";
const router = express.Router();

router.get("/messages/:chat", verifyToken, getMessagesInChat);
router.post("/message/:chat", verifyToken, sendMessage);
router.post("/message/attachments/:chat", verifyToken, upload.array("messageAttachement", 4),sendAttachments);
router.put("/seen-message/:chatId", verifyToken, markAllMessagesAsSeen);
router.delete("message/:messageId", verifyToken, deleteMessage);

export default router;
