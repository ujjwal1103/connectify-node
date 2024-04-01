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
import { uploadImage } from "../utils/uploadImage.js";


export const uploadImageToFirebase = asyncHandler(async (req, res) => {
  const imageUrl = await uploadImage(req.file.originalname, "uploads");
  if (!imageUrl) throw new ApiError(400, "Failed to Upload Image");
  return res.status(200).json({ url: imageUrl });
});

export const deleteImageFromStorage = asyncHandler(async (req, res) => {
  const imageUrl = req.body;
  const result = deleteImage(image);
  return res.status(200).json({ message: "Image Deleted Successfully" });
});

export const getAllImagesFromStorage = asyncHandler(async (req, res) => {
  const { foldername } = req.params;
  const storageRef = ref(storage, foldername);
  const options = {
    maxResults: parseInt(3),
    pageToken: 1, 
  };
  const items = await list(storageRef, options);

  const allImages = await Promise.all(
    items.items.map(async (item) => {
      const imageRef = ref(storage, item.fullPath);

      const imageURL = await getDownloadURL(imageRef);

      return { url: imageURL, filename: getFileNameFromPath(item.fullPath) };
    })
  );

  return res.status(200).json({ data: allImages.sort() });
});

export const getAllFolderNames = asyncHandler(async (req, res) => {
  const folderStorageRef = ref(storage);
  const fitems = await listAll(folderStorageRef);

  const result = fitems.prefixes.map((prefix, i) => {
    const pathArray = prefix.fullPath.split("/");
    return pathArray;
  });

  const foldernames = [].concat(...result);

  return res.status(200).json({ data: foldernames });
});

function getFileNameFromPath(filePath) {
  // Use the split method to separate the path based on "/"
  const pathArray = filePath.split("/");

  // The last element of the array will be the file name
  const fileName = pathArray[pathArray.length - 1];

  return fileName;
}
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
