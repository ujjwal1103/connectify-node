import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const followRequestScheme = new Schema(
  {
    requestedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    requestStatus: {
      type: String,
      default: "PENDING",
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
    },
  },
  { timestamps: true }
);

followRequestScheme.plugin(mongooseAggregatePaginate);

export const FollowRequest = mongoose.model("FollowRequest", followRequestScheme);
