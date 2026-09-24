const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY || "prabhuPooja001"; 

exports.AgentGenerateToken = (agentOrId) => {
  const isObj = typeof agentOrId === 'object' && agentOrId !== null;
  const id = isObj ? agentOrId.id : agentOrId;
  const email = isObj ? agentOrId.email : undefined;
  const name = isObj ? agentOrId.name : undefined;

  const payload = {
    userId: id,
    id: id,
    role: "agent",
    email: email,
    name: name
  };

  return jwt.sign(payload, jwt_secret_key, { expiresIn: "15d" });
};

exports.AgentVerifyToken = (req, res, next) => {
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
      role: decoded.role || "agent",
      email: decoded.email,
      name: decoded.name
    };

    next();
  });
};