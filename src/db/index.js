import mongoose from "mongoose";

/** @type {typeof mongoose | undefined} */
export let dbInstance = undefined;

const connectDB = async (url) => {
  try {
    const connectionInstance = await mongoose.connect(url);
    dbInstance = connectionInstance;
    console.log(
      `\n☘️  MongoDB Connected! Db host: ${connectionInstance.connection.host}\n`
    );
  } catch (error) {
    console.log("MongoDB connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;
