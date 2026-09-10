const express = require("express");
const orderController = require("../Controllers/orderController");
const { verifyToken } = require("../config/genratetokenConfig");
const { AdminOrAgentVerifyToken } = require("../config/adminOrAgentToken");

const router = express.Router();

router.post("/create", verifyToken, orderController.create);
router.get("/get", AdminOrAgentVerifyToken, orderController.getAll);
router.get("/getby/:userId", verifyToken, orderController.getbyId);
router.put("/update/:id", verifyToken, orderController.update);
router.delete("/delete/:id", verifyToken, orderController.delete);
router.get("/getbyuser/:orderId", verifyToken, orderController.getProductByOrderId);
router.get("/getbyseller/:orderId", orderController.getProductByOrderId);
router.get("/getbymarchantId/:merchantId", orderController.getByMerchantId);
router.get('/getCustomer/:merchantId', orderController.getCustomerByMerchantId);
router.get('/getOrder/:orderId/:merchantId', orderController.getOrderbyOrderId);
router.get('/getOrdersTrackingByUser/:orderId', orderController.orderTrackingByUser);
router.put('/cancelOrder/:orderId', orderController.CancelOrder);
router.get('/totalIncome', AdminOrAgentVerifyToken, orderController.totalOrderIncome);
router.get('/expend/:userId', AdminOrAgentVerifyToken, orderController.userOrderById);

// Order status updates (support both correct spelling and previous typo alias)
router.put('/updateStatus/:orderId', AdminOrAgentVerifyToken, orderController.statusUpdate);
router.put('/updateStauts/:orderId', AdminOrAgentVerifyToken, orderController.statusUpdate);

// Return, Refund & Replacement Routes
router.post('/retrun-order', orderController.returnOrder);
router.post('/return-order', orderController.returnOrder);
router.post('/return', orderController.returnOrder);
router.post('/request-return', orderController.returnOrder);
router.post('/request-replacement', orderController.returnOrder);

router.get('/admin/returns', AdminOrAgentVerifyToken, orderController.getAllReturnsForAdmin);
router.get('/admin/all-returns', AdminOrAgentVerifyToken, orderController.getAllReturnsForAdmin);
router.get('/returns/all', AdminOrAgentVerifyToken, orderController.getAllReturnsForAdmin);

router.put('/admin/update-return/:id', AdminOrAgentVerifyToken, orderController.updateReturnStatusByAdmin);
router.put('/refund_order/:order_id', AdminOrAgentVerifyToken, orderController.updateReturnStatusByAdmin);
router.put('/refund-order/:order_id', AdminOrAgentVerifyToken, orderController.updateReturnStatusByAdmin);

router.get('/my-returns', verifyToken, orderController.getUserReturns);
router.get('/user-returns/:userId', orderController.getUserReturns);

router.get('/getCount/:status', orderController.getOrderTrackingByStatus);
router.get('/tracking/status/:status', orderController.getOrderTrackingByStatus);
router.get('/payementCount/:status', orderController.TrackingStatus);
router.get('/getOrderId/:orderId', orderController.getByOrderId);
router.get('/getCustomerDetail/:userId', orderController.getCustomerDetail);
router.get('/recentOrders', orderController.RecentOrders);
router.get('/invoice/:orderId', orderController.downloadOrderInvoice);
router.get('/download-invoice/:orderId', orderController.downloadOrderInvoice);

module.exports = router;

