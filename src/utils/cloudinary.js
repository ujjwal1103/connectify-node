import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: "dtzyaxndt",
  api_key: "355669528939713",
  api_secret: "3UPOW7j-JmdW32kysbr_5u_sOBc",
});

// http://res.cloudinary.com/dtzyaxndt/image/upload/v1712471612/65d0b8cbcf65c91cd0e0dc07/postImages/g5mtswr6fyb3ea7qcy5s.jpg

const uploadOnCloudinary = async (localFilePath, folder) => {
  try {
    if (!localFilePath) return null;
    // Validate file type (only allow images)
    // const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"]; // Add more if needed
    // const fileExtension = localFilePath.split(".").pop().toLowerCase();
    // if (!allowedExtensions.includes(fileExtension)) {
    //   console.log(
    //     "Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed."
    //   );
    //   throw new ApiError(
    //     404,
    //     "Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed."
    //   );
    // }
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      use_filename: true,
      resource_type: "auto",
    });
    // file has been uploaded successfull
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw new ApiError(400, error.message);
  }
};
const uploadVideoCloudinary = async (localFilePath, folder,aspectRatio) => {
  try {
    if (!localFilePath) return null;
    // Validate file type (only allow images)
    // const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"]; // Add more if needed
    // const fileExtension = localFilePath.split(".").pop().toLowerCase();
    // if (!allowedExtensions.includes(fileExtension)) {
    //   console.log(
    //     "Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed."
    //   );
    //   throw new ApiError(
    //     404,
    //     "Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed."
    //   );
    // }
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      use_filename: true,
      resource_type: "video",
      transformation: [{ aspect_ratio: aspectRatio, crop: "crop" }],
      eager: [{ format: "mp4" }],
    });
    // file has been uploaded successfull
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw new ApiError(400, error.message);
  }
};

const uploadMultipleOnCloudinary = async (localFilePaths = [], folder) => {
  try {
    const uploadPromises = localFilePaths.map(async (f) => {
      let res;
      if (f.isVideo) {
        res = await uploadVideoCloudinary(f.path, folder, f.aspectRatio);
      } else {
        res = await uploadOnCloudinary(f.path, folder);
      }
      return {
        url: res?.secure_url,
        publicId: res?.public_id,
        type: f.isVideo ? "VIDEO":"IMAGE"
      };
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (error) {
    throw new ApiError(400, error.message);
  }
};

const deleteFromCloudinary = async (publicIds = []) => {
  try {
    const deletePromises = publicIds.map(async (publicId) => {
      // Delete the file from Cloudinary
      const deletionResponse = await cloudinary.uploader.destroy(publicId);
      return deletionResponse.result === "ok";
    });

    const deletionResults = await Promise.all(deletePromises);
    return deletionResults;
  } catch (error) {
    throw new Error(`Failed to delete files from Cloudinary: ${error.message}`);
  }
};

const deleteMultipleFromCloudinary = async (publicIds = []) => {
  try {
    const deletionResults = await deleteFromCloudinary(publicIds);
    return deletionResults.filter((result) => result === true);
  } catch (error) {
    throw new Error(
      `Failed to delete multiple files from Cloudinary: ${error.message}`
    );
  }
};

export {
  uploadOnCloudinary,
  uploadMultipleOnCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  uploadVideoCloudinary,
};
