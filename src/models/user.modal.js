import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { AvailableSocialLogins, UserLoginType } from "../constants/index.js";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    loginType: {
      type: String,
      enum: AvailableSocialLogins,
      default: UserLoginType.EMAIL_PASSWORD,
    },
    mobile: {
      type: Number,
    },
    password: {
      type: String,
      required: true,
    },

    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    avatar: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    bio: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.plugin(mongooseAggregatePaginate);

userSchema.methods.generateAccessToken = function () {
  console.log(this);
  return jwt.sign(
    {
      userId: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.JWT_ACCESS_SECREATE,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE }
  );
};

userSchema.methods.generateRefreshToken = function () {
  console.log(this);
  return jwt.sign(
    {
      userId: this._id,
    },
    process.env.JWT_REFRESS_SECREATE,
    { expiresIn: process.env.JWT_REFRESS_EXPIRE }
  );
};

const User = mongoose.model("User", userSchema);

export default User;
