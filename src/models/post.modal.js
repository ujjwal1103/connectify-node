import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true,
    },
    hashtags: {
      type: [String],
      trim: true,
      lowercase: true,
    },
    imageUrl: [
      {
        type: String,
        required: true,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

postSchema.plugin(mongooseAggregatePaginate);

const Post = mongoose.model("Post", postSchema);

export default Post;
