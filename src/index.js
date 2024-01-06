import dotenv from "dotenv";
import { httpServer } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const startServer = () => {
  httpServer.listen(3200, () => {
    console.log("⚙️  Server is running on port: " + 3200);
  });
};

connectDB(process.env.MONGO_DB_URL)
  .then(() => {
    startServer();  
  })
  .catch((err) => {
    console.log("Mongo db connect error: ", err);
  });
