const DB_NAME = process.env.DB_NAME || "connectify";
const MONGODB_URL = process.env.MONGO_DB_URL;

console.log(process.env.MONGO_DB_URL);
export { MONGODB_URL, DB_NAME };
