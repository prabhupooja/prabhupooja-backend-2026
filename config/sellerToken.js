const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY || "prabhuPooja001";

exports.sellerGenerateToken = (userId) => {
  const payload = {
    userId,
    id: userId,
    role: "seller"
  };
  return jwt.sign(payload, jwt_secret_key, { expiresIn: "15d" });
};

exports.sellerVerifyToken = (req, res, next) => {
  let token = req.headers.authorization || req.headers['x-auth-token'] || req.headers['token'] || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "No Token Provided!" });
  }

  if (typeof token === 'string') {
    token = token.trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
  }

  jwt.verify(token, jwt_secret_key, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Failed to Authenticate", error: err.message });
    }

    const sellerId = decoded.userId || decoded.id;
    req.user = { id: sellerId, userId: sellerId, role: decoded.role || "seller" };
    next();
  });
};