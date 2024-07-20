import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const bookmarkSchema = new mongoose.Schema(
  {
    bookmarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assuming a User model
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // Assuming a User model
  },
  { timestamps: true }
);

bookmarkSchema.plugin(mongooseAggregatePaginate);
const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

export default Bookmark;
