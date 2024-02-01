import express from "express";
import  {uploadImageToFirebase}  from "../controller/upload.controller.js";
import { upload } from "../middleware/index.js";


const router = express.Router();

router.post("/admin/uploadImage", upload.single("image"), uploadImageToFirebase);

export default router;
