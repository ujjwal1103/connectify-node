import path from "path";
// import sharp from "sharp";
import { uploadImage } from "./uploadImage.js";
import fs from "fs";
import axios from "axios";
export const resizeImage = ()=>{}
export const resizeImageAndUpload=()=>{}
// export const resizeImage = async (imagePath, name, size = 20) => {
//   const fileExtension = path.extname(name);
//   const fileName = `${path.basename(name, fileExtension)}small${fileExtension}`;
//   const resizedImagePath = `public/images/${fileName}`;

//   const res = await sharp(imagePath).resize(size).toFile(resizedImagePath);

//   if (res) {
//     return fileName;
//   }
// };

// export const resizeImageAndUpload = async (
//   url,
//   name,
//   size = 20,
//   foldername
// ) => {
//   const fileExtension = path.extname(name);
//   const imageData = await downloadImage(url);
//   const fileName = `${path.basename(name, fileExtension)}small${fileExtension}`;
//   const resizedImageBuffer = await sharp(imageData).resize(size).toBuffer();

//   const resizedImagePath = `public/images/${fileName}`;

//   await sharp(resizedImageBuffer).toFile(resizedImagePath);

//   const downloadUrl = await uploadImage(fileName, foldername);
//   return downloadUrl;
// };

export const downloadImage = async (url) => {
  const response = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
  });

  return response.data;
};
