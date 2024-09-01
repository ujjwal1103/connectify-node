import Story, { UserStories } from "../models/story.modal.js";
import asyncHandler from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const createStory = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  if (!req.file) {
    throw new ApiError(404, "Image is required");
  }

  const resp = await uploadOnCloudinary(
    req.file.path,
    `${userId}/stories`,
  );

  const story = await Story.create({
    content: {
      url: resp.secure_url,
      publicId: resp.public_id,
    },
    storyOwner: userId
  });

  if (!story) {
    throw new ApiError(400, `story creation failed`);
  }
  const userStories = await UserStories.findOne({ user: userId }).lean();

  if (userStories) {
    const updatedUserStories = await UserStories.findOneAndUpdate(
      { user: userId },
      { $push: { stories: story._id } }, // Update operation to push story ID
      { new: true }
    ).lean();
    return res.status(201).json({
      story: updatedUserStories,
      message: "Story created successfully",
      isSuccess: true,
    });
  }
  const newUserStories = await UserStories.create({
    user: userId,
    stories: [story._id],
  });

  if (!newUserStories) {
    await Story.findByIdAndDelete(story._id);
    throw new ApiError(400, `story creation failed`);
  }
  res.status(201).json({
    story: newUserStories,
    message: "Story created successfully",
    isSuccess: true,
  });
});

export const getstories = asyncHandler(async (req, res) => {
  const stories = await UserStories.find()
    .populate({
      path: "user",
      select: "username avatar", // Specify the fields you want to include for the user
    })
    .populate("stories")
    .lean();
  res.status(200).json({
    stories: stories.filter(story=>story.stories.length),
    message: "Story fetch successfully",
    isSuccess: true,
  });
});

export const deleteStory = asyncHandler((req, res) => {
  const { storyId } = req.params;


});
