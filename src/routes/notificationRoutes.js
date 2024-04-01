import express from "express";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";
import { addNotifications, getAllNotifications, getUnseenNotificationCount } from "../controller/notificationController.js";

router.get("/notifications", verifyToken, getAllNotifications);
router.post("/notifications", verifyToken, addNotifications);
router.get("/notification/count", verifyToken, getUnseenNotificationCount);


export default router;