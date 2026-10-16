const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY || "prabhuPooja001"; 

exports.AdmingenerateToken = (userId) => {
  const payload = {
    userId,
    role: "admin"
  };
  return jwt.sign(payload, jwt_secret_key, { expiresIn: "15d" });
};

exports.AdminverifyToken = (req, res, next) => {
  const token = req.headers.authorization; 

  if (!token) {
    return res.status(401).json({ message: "No Token Provied!" });
  }

  const tokenValue = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

  const handleDecoded = (decoded) => {
    if (decoded.role === "agent" || decoded.role === "staff") {
      return res.status(403).json({ 
        success: false, 
        message: "Access forbidden: Admin privileges required" 
      });
    }
    req.user = { id: decoded.userId, role: decoded.role || "admin" };
    next();
  };

  jwt.verify(tokenValue, jwt_secret_key, (err, decoded) => {
    if (!err && decoded) {
      return handleDecoded(decoded);
    }
    jwt.verify(tokenValue, "prabhuPooja001", (fallbackErr, fallbackDecoded) => {
      if (!fallbackErr && fallbackDecoded) {
        return handleDecoded(fallbackDecoded);
      }
      return res.status(401).json({ message: "Failed to Authenticate" });
    });
  });
};
