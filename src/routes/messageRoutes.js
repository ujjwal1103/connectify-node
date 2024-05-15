import express from "express";
import { upload, verifyToken } from "../middleware/index.js";
import {
  deleteMessage,
  deleteMultipleMessage,
  getMessagesInChat,
  markAllMessagesAsSeen,
  markMessageAsSeen,
  sendAttachments,
  sendMessage,
  sendMessageToUsers,
} from "../controller/messageController.js";
const router = express.Router();

router.get("/messages/:chat", verifyToken, getMessagesInChat);
router.post("/message/:chat", verifyToken, sendMessage);
router.post("/message/u/send", verifyToken, sendMessageToUsers);
router.post("/message/attachments/:chat", verifyToken, upload.array("messageAttachement", 4),sendAttachments);
router.put("/seen-message/:chatId", verifyToken, markAllMessagesAsSeen);
router.put("/message/seen/:messageId", verifyToken, markMessageAsSeen);
router.delete("/message/:messageId", verifyToken, deleteMessage);
router.delete("/messages", verifyToken, deleteMultipleMessage);

export default router;
