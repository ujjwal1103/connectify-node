import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadImage } from "../utils/uploadImage.js";

export const uploadImageToFirebase = asyncHandler(async (req, res) => {
  const imageUrl = await uploadImage(req.file.originalname, "uploads");
  if (!imageUrl) throw new ApiError(400, "Failed to Upload Image");
  return res.status(200).json({ url: imageUrl });
});

export const deleteImageFromStorage = asyncHandler(async (req, res) => {
  const imageUrl = req.body;

  return res.status(200).json({ message: "Image Deleted Successfully" });
});
