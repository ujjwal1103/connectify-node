import Story from "../models/story.js";

export const createStory = async (req, res) => {
  try {
    const story = await Story.create({
      user: req.user.userId,
      content: req.body.content,
    });

    res.status(201).json({
      story: story,
      message: "Story created successfully",
      isSuccess: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: error.message || "something went wrong",
      isSuccess: false,
    });
  }
};

export const getstories = async (req, res) => {
  try {
    const stories = await Story.find({ user: req.user.userId }).populate(
      "user",
      "-password"
    );
    res.status(201).json({
      stories: stories,
      message: "Story fetch successfully",
      isSuccess: true,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: error.message || "something went wrong",
      isSuccess: false,
    });
  }
};
