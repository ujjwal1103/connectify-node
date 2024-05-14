import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const imageSchema = new mongoose.Schema({
  url: {
      type: String,
      required: true
  },
  publicId: {
      type: String,
      required: true
  },
  type:{
    type: String,
    default: 'IMAGE',
    enum:["VIDEO","IMAGE"]
  }
});

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
    postType: {
      type:String,
      default: "POST",
      enum:["POST","REEL"]
    },
    images: [
      {
        type: imageSchema,
        required: true,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index:true,
    },
  },
  { timestamps: true }
);

postSchema.plugin(mongooseAggregatePaginate);

const Post = mongoose.model("Post", postSchema);

export default Post;
