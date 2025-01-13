import jwt from "jsonwebtoken";
import multer from "multer";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    if (file) {
      cb(null, file?.originalname || "");
    }
  },
});

export const upload = multer({
  storage: storage,
  limits: { fieldSize: 25 * 1024 * 1024 },
});

export const verifyToken = asyncHandler((req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  const secretKey = process.env.JWT_ACCESS_SECREATE;

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      throw new ApiError(401, "Unauthorized: Invalid token");
    }
    req.user = decoded;
    next();
  });
});

export const validateUsernamePassword = (req, res, next) => {
  const { path } = req.route;
  const { username, password, email } = req.body;

  const getVariableName = (data) => {
    let keys = "";
    for (let key in data) {
      keys += key + ", ";
    }
    return keys + "are required";
  };
  if (
    (path === "/login" && (username === "" || email === "")) ||
    (path === "/register" &&
      (username === "" || email === "" || password === ""))
  ) {
    return res.status(401).json({ message: getVariableName(req.body) });
  }
  next();
};

export const isAdmin = (req, rea, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const secretKey = "ujjwal";
};

export const validateUsername = asyncHandler(async (req, res, next) => {
  const usernamePattern = /^(?!^[0-9])(?!.*[^a-z0-9_]).+$/;
  const username = req.params.username;
  if (!username) {
    throw new ApiError(400, "username is required");
  }

  if (!username.match(usernamePattern)) {
    throw new ApiError(400, "Invalid username");
  }

  next();
});
