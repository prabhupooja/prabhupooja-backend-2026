const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY || "prabhuPooja001";

exports.AdminOrAgentVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No Token Provided!" });
  }

  const tokenValue = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader.split(" ")[1] || authHeader;

  jwt.verify(tokenValue, jwt_secret_key, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Failed to Authenticate Token" });
    }

    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role || "staff"
    };

    next();
  });
};
