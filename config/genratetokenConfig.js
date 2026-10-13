const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwt_secret_key = process.env.JWT_SECRET_KEY; 

exports.generateToken = (userId) => {

  const payload = {
    userId
   };
  return jwt.sign(payload,jwt_secret_key, {expiresIn: "15d"} );
};

exports.verifyToken = (req, res, next) => {
 
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

exports.optionalVerifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return next();
  }
  const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  jwt.verify(tokenValue, jwt_secret_key, (err, decoded) => {
    if (!err && decoded) {
      req.user = { id: decoded.userId };
    }
    next();
  });
};