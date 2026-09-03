const express = require("express")
const multer = require("multer")
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const puja = require("../Controllers/onlinePujaController");
const { AdminverifyToken } = require("../config/admintoken");


const router = express.Router()

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `onlinePooja/${Date.now().toString()}-${file.originalname}`);
    },

  })
});

router.post("/create", upload.single('image'),AdminverifyToken, puja.create)
router.get("/get", puja.get)
router.get("/get/:id", puja.getById)
router.put("/update/:id", upload.single('image'),AdminverifyToken, puja.updatePuja)
router.delete("/delete/:id",AdminverifyToken, puja.delete)
router.get("/search", puja.searchPooja)
router.post("/poojaDetailsforpandit", puja.poojaDetailsforpandit)
router.get("/:poojaId/pandits", puja.getPanditsByPoojaId)

module.exports = router