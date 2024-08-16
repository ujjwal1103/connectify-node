import {
  deleteObject,
  getDownloadURL,
  list,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase.config.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  listAllAssets,
  listAllSubFolders,
  listAssetsByFolder,
  listRootFolders,
  uploadOnCloudinary,
  uploadVideoCloudinary,
} from "../utils/cloudinary.js";

export const uploadImageToFirebase = asyncHandler(async (req, res) => {
  console.log(req.file.mimetype, req.file.mimetype.includes("video"));
  const file = await uploadVideoCloudinary(req.file.path, "videos");
  if (!file) throw new ApiError(400, "Failed to Upload Image");
  return res.status(200).json({ file: file });
});

export const deleteImageFromStorage = asyncHandler(async (req, res) => {
  const imageUrl = req.body;
  const result = deleteImage(image);
  return res.status(200).json({ message: "Image Deleted Successfully" });
});

export const getAllImagesFromStorage = asyncHandler(async (req, res) => {
  const { foldername } = req.params;
  const allImages = await listAssetsByFolder(foldername);
  const result = await listAllSubFolders(folder);
   
  
  return res.status(200).json({ data: allImages });
});

export const getAllFolderNames = asyncHandler(async (req, res) => {
  const result = await listRootFolders();
  return res.status(200).json({ data: result });
});

export const getAllSubFolders = asyncHandler(async (req, res) => {
  const { folder } = req.params;
 
  return res.status(200).json({ data: result });
});

const fetchUrlAsArrayBuffer = async (url) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error("Error fetching URL as ArrayBuffer:", error);
    throw new Error("Failed to fetch URL as ArrayBuffer");
  }
};

export const renameFile = async (req, res) => {
  const { oldPath, newPath, oldImageUrl } = req.body;
  const oldFileRef = ref(storage, oldPath);
  const blob = await fetchUrlAsArrayBuffer(await getDownloadURL(oldFileRef));
  const newFileRef = ref(storage, newPath);
  await uploadBytes(newFileRef, blob);
  await deleteObject(oldFileRef);

  return res.status(200).json({ success: true });
};
