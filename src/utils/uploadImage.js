import { ref, getDownloadURL, uploadString, deleteObject } from "firebase/storage";
import { storage } from "../firebase.config.js";

export const uploadImage = async (file, foldername, filename) => {
  try {
    const storageRef = ref(storage, `${foldername}/${filename}`);

    const snapshot = await uploadString(storageRef, file, "data_url");
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("File successfully uploaded.");

    return downloadURL;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const deleteImage = async (image) => {
  const storageRef = ref(storage, image);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.log(error);
  }
};
