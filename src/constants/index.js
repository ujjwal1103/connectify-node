const DB_NAME = process.env.DB_NAME || "connectify";
const MONGODB_URL = process.env.MONGO_DB_URL;

const UserLoginType = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

const AvailableSocialLogins = Object.values(UserLoginType);

export const USERID_NOT_FOUND = "UserId Not Found";

export { MONGODB_URL, DB_NAME, UserLoginType, AvailableSocialLogins };
