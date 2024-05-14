import express from "express";
import {
  getAllFolderNames,
  getAllImagesFromStorage,
  renameFile,
  uploadImageToFirebase,
} from "../controller/upload.controller.js";
import { upload } from "../middleware/index.js";

const router = express.Router();

router.post(
  "/admin/uploadImage",
  upload.single("file"),
  uploadImageToFirebase
);
router.post(
  "/uploadFile",
  upload.single("file"),
  uploadImageToFirebase
);
router.get("/admin/images/:foldername", getAllImagesFromStorage);
router.get("/admin/folders", getAllFolderNames);
router.post("/admin/rename", renameFile);

export default router;



