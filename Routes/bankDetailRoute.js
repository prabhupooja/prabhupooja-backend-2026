const express =require('express');
const router= express.Router();

const bankDetail= require('../Controllers/bankDetailControlr');
const {sellerVerifyToken}=require('../config/sellerToken');


router.post('/add', sellerVerifyToken, bankDetail.create);
router.get('/get', sellerVerifyToken, bankDetail.getBankDetailsByMerchantId);
router.get('/get/:merchant_id', sellerVerifyToken, bankDetail.getBankDetailsByMerchantId);
router.put('/update', sellerVerifyToken, bankDetail.updateBankDetailsByMerchantId);
router.put('/update/:merchant_id', sellerVerifyToken, bankDetail.updateBankDetailsByMerchantId);
router.delete('/delete', sellerVerifyToken, bankDetail.deleteBankDetailsByMerchantId);
router.delete('/delete/:merchant_id', sellerVerifyToken, bankDetail.deleteBankDetailsByMerchantId);
router.post('/withdrawal-request', sellerVerifyToken, bankDetail.requestWithdrawal);
router.get('/get-withdrawal-request', sellerVerifyToken, bankDetail.getWithdrawalRequests);
router.get('/get-withdrawal-request/:sellerId', sellerVerifyToken, bankDetail.getWithdrawalRequests);
router.post('/verifyBankAccount/:id/:amount', sellerVerifyToken, bankDetail.verifyBankAccount);






module.exports=router;