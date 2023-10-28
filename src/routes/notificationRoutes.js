import express from "express";
const router = express.Router();
import { verifyToken } from "../middleware/index.js";
import { addNotifications, getAllNotifications } from "../controller/notificationController.js";

router.get("/notifications", verifyToken, getAllNotifications);
router.post("/notifications", verifyToken, addNotifications);


export default router;