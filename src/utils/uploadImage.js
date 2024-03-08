import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase.config.js";
import { promises as fsPromises } from 'fs';

export const uploadImage = async (filename, foldername) => {
  const storageRef = ref(storage, `${foldername}/${filename}`);
  const file = await fsPromises.readFile(`public/images/${filename}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  if (downloadURL) {
    await fsPromises.unlink(`public/images/${filename}`);
  }
  return downloadURL;
};

export const deleteImage = async (image) => {
  if (!image) return;
  const storageRef = ref(storage, image);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.log(error);
  }
};
