import jwt from "jsonwebtoken";
import multer from "multer";

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

export const upload = multer({ storage: storage });

// Define a middleware function for token verification
export function verifyToken(req, res, next) {
  // Get the token from the request header, query parameter, or cookies
  const token = req.header("Authorization");

  // Check if a token is provided
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  // Verify the token using your secret key
  const secretKey = "ujjwal"; // Replace with your actual secret key
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
    req.user = decoded;
    next();
  });
}

export function validateUsernamePassword(req, res, next) {
  const { path } = req.route;
  const { username, password, email } = req.body;

  const getVariableName = (data) => {
    let keys = "";
    for (var key in data) {
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
}

//middleware to check the current logged in user is admin or not

export function isAdmin(req, rea, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const secretKey = "ujjwal";
}
