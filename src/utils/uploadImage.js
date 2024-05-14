import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase.config.js";
import { promises as fsPromises } from 'fs';

import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: ' ', 
  api_key: '355669528939713', 
  api_secret: '3UPOW7j-JmdW32kysbr_5u_sOBc' 
});

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

export const uploadImages = async (filenames, foldername) => {
try {
  const downloadURLs = [];
  for (const filename of filenames) {
    const storageRef = ref(storage, `${foldername}/${filename}`);
    const fileData = await fsPromises.readFile(`public/images/${filename}`);

    const fileUint8Array = new Uint8Array(fileData);
    const snapshot = await uploadBytes(storageRef, fileUint8Array);
    const downloadURL = await getDownloadURL(snapshot.ref);
    if (downloadURL) {
      await fsPromises.unlink(`public/images/${filename}`);
      downloadURLs.push(downloadURL);
    }
  }

  return downloadURLs;
} catch (error) {
  console.log(error)
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
