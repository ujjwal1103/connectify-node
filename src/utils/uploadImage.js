import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase.config.js";
import fs from "fs";
export const uploadImage = async (filename, foldername) => {
  try {
    const storageRef = ref(storage, `${foldername}/${filename}`);

    const file = fs.readFileSync(`public/images/${filename}`);

    const snapshot = await uploadBytes(storageRef, file);

    const downloadURL = await getDownloadURL(snapshot.ref);
    if (downloadURL) {
      fs.unlinkSync(`public/images/${filename}`);
    }

    return downloadURL;
  } catch (error) {
    console.log(error);
    return error;
  }
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
