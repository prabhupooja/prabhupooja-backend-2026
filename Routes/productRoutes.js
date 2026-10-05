const express = require("express");
const product = require("../Controllers/productController");
const { AdminverifyToken } = require("../config/admintoken");
const { sellerVerifyToken } = require("../config/sellerToken");
const cacheMiddleware = require("../middlewares/cacheMiddleware");
const { deleteCache } = require("../config/redis");
const { createCloudinaryUpload } = require("../config/cloudinary");

const router = express.Router();

const upload = createCloudinaryUpload("products");

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

router.post("/create", upload.array("image", 15), AdminverifyToken, clearProductCache, product.create);
router.post('/createByMerchant', upload.array("image", 15), sellerVerifyToken, clearProductCache, product.create);
router.get("/get", cacheMiddleware(600, "products"), product.getAll);
router.get('/getAll', cacheMiddleware(600, "products"), product.getAllProducts);
router.get("/get/:id", cacheMiddleware(600, "products"), product.getById);
router.get("/getProduct/:id", AdminverifyToken, product.getByIdProduct);
router.get('/getByMerchantId/:merchantId', sellerVerifyToken, product.getByMerchantId);
router.get('/admin-getByMerchantId/:merchantId', AdminverifyToken, product.getByMerchantId);
router.put("/update/:id", upload.array("image", 15), clearProductCache, product.update);
router.put('/updateByMerchant/:id', upload.array("image", 15), sellerVerifyToken, clearProductCache, product.updateByMerchant);
router.put('/updateByMerchant/:id/:merchantId', upload.array("image", 15), sellerVerifyToken, clearProductCache, product.updateByMerchant);
router.delete("/delete/:id", AdminverifyToken, clearProductCache, product.delete);
router.delete('/deleteByMerchant/:id', sellerVerifyToken, clearProductCache, product.deleteByMerchant);
router.delete('/deleteByMerchant/:id/:merchantId', sellerVerifyToken, clearProductCache, product.deleteByMerchant);
router.get("/search", product.searchProduct);
router.put('/verifyProduct/:productId/:merchantId', clearProductCache, product.verifyProduct);
router.put('/rejectProduct/:productId/:merchantId', clearProductCache, product.rejectProduct);
router.get('/reletedProduct/:id', cacheMiddleware(600, "products"), product.reletedProduct);
router.post('/addReview', upload.array("comment_image", 5), product.productReview);
router.get('/getReview/:productId', product.getProductReviews);
router.post('/wishList', product.wishList);
router.get('/getWishlist/:user_id', product.getWishlist);
router.get('/getLikedProduct/:user_id/:product_id', product.getWishlistStatus);
router.delete('/deleteWishlistProduct/:user_id/:product_id', product.deleteWishlistItem);
router.get('/getAllReview', product.getAllReview);
router.delete('/deleteReview/:review_id', product.deleteReview);
router.delete('/deleteReview/:id', product.deleteReview);
router.put('/productActive/:productId', clearProductCache, product.productActive);
router.put('/productActive/:id', clearProductCache, product.productActive);
router.patch('/productActive/:productId', clearProductCache, product.productActive);
router.patch('/productActive/:id', clearProductCache, product.productActive);
router.put('/toggleStatus/:productId', clearProductCache, product.productActive);
router.put('/toggleStatus/:id', clearProductCache, product.productActive);
router.put('/toggle-status/:productId', clearProductCache, product.productActive);
router.put('/toggle-status/:id', clearProductCache, product.productActive);
router.put('/status/:productId', clearProductCache, product.productActive);
router.put('/status/:id', clearProductCache, product.productActive);
router.get('/getAllProductsByfillter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);
router.get('/getAllProductsByFilter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);
router.get('/filter', cacheMiddleware(300, "products"), product.getAllProductsByfillter);

module.exports = router;


