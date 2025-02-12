const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

router.post('/email-check', authController.emailCheck);
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);



router.post('/resend-otp', (req, res, next) => {
    console.log('Resend OTP route hit');
    next();
  }, authController.resendOtp);
  

module.exports = router;
