const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY || "prabhuPooja001"; 

exports.AgentGenerateToken = (userId) => {

  const payload = {
    userId
   };
  return jwt.sign(payload,jwt_secret_key, {expiresIn: "15d"} );
};

exports.AgentVerifyToken = (req, res, next) => {
 
  const token = req.headers.authorization; 

if(!token){

  return res.status(401).json({message:"No Token Provied!"})
}

const tokenValue = token.split(' ')[1];

jwt.verify(tokenValue,  JWT_KEY= jwt_secret_key, (err,decoded)=>{
  if(err){

    return res.status(401).json({message:"Failed to Authenticate"});
  }

  req.user = {id: decoded.userId};

  next();


})

};