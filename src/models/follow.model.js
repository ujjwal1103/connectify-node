import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const followSchema = new Schema(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    // The one who is being followed
    followeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,  
    },
  },
  { timestamps: true }
);

followSchema.plugin(mongooseAggregatePaginate);

export const Follow = mongoose.model("Follow", followSchema);
