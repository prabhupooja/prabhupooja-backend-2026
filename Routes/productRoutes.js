const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const product = require("../Controllers/productController");
const { AdminverifyToken } = require("../config/admintoken");
const { sellerVerifyToken } = require("../config/sellerToken");
const cacheMiddleware = require("../middlewares/cacheMiddleware");
const { deleteCache } = require("../config/redis");

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `products/${Date.now().toString()}-${file.originalname}`);
    },
  }),
});

// Middleware to clear product caches on mutations
const clearProductCache = async (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      deleteCache("api_cache:/api/v1/products*").catch(() => {});
      deleteCache("products:*").catch(() => {});
    }
  });
  next();
};

router.post("/create", upload.array("image", 5), AdminverifyToken, clearProductCache, product.create);
router.post('/createByMerchant', upload.array("image", 5), sellerVerifyToken, clearProductCache, product.create);
router.get("/get", cacheMiddleware(600, "products"), product.getAll);
router.get('/getAll', cacheMiddleware(600, "products"), product.getAllProducts);
router.get("/get/:id", cacheMiddleware(600, "products"), product.getById);
router.get("/getProduct/:id", AdminverifyToken, product.getByIdProduct);
router.get('/getByMerchantId/:merchantId', sellerVerifyToken, product.getByMerchantId);
router.get('/admin-getByMerchantId/:merchantId', AdminverifyToken, product.getByMerchantId);
router.put("/update/:id", upload.array("image", 5), clearProductCache, product.update);
router.put('/updateByMerchant/:id', upload.array("image", 5), sellerVerifyToken, clearProductCache, product.updateByMerchant);
router.put('/updateByMerchant/:id/:merchantId', upload.array("image", 5), sellerVerifyToken, clearProductCache, product.updateByMerchant);
router.delete("/delete/:id", AdminverifyToken, clearProductCache, product.delete);
router.delete('/deleteByMerchant/:id', sellerVerifyToken, clearProductCache, product.deleteByMerchant);
router.delete('/deleteByMerchant/:id/:merchantId', sellerVerifyToken, clearProductCache, product.deleteByMerchant);
router.get("/search", product.searchProduct);
router.put('/verifyProduct/:productId/:merchantId', clearProductCache, product.verifyProduct);
router.put('/rejectProduct/:productId/:merchantId', clearProductCache, product.rejectProduct);
router.get('/reletedProduct/:id', cacheMiddleware(600, "products"), product.reletedProduct);
router.post('/addReview', upload.array("comment_image", 5), product.productReview);
router.get('/getReview/:productId', cacheMiddleware(300, "products"), product.getProductReviews);
router.post('/wishList', product.wishList);
router.get('/getWishlist/:user_id', product.getWishlist);
router.get('/getLikedProduct/:user_id/:product_id', product.getWishlistStatus);
router.delete('/deleteWishlistProduct/:user_id/:product_id', product.deleteWishlistItem);
router.get('/getAllReview', cacheMiddleware(300, "products"), product.getAllReview);
router.delete('/deleteReview/:review_id', product.deleteReview);
router.put('/productActive/:productId', clearProductCache, product.productActive);
router.get('/getAllProductsByfillter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);
router.get('/getAllProductsByFilter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);
router.get('/filter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);

module.exports = router;


