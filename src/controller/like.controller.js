import { ApiError } from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler";

const likeDislikePost = asyncHandler((req, res) => {
  const { postId } = req.params;
  const {userId} = req.user;

  if(!postId){
    throw ApiError(404, "Invalide Post Id");
  }

  

  res.status(200).json({
    message: "post Liked SuccessFully",
  });
});

export { likeDislikePost };
