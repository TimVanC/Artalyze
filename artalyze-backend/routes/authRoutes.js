const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Ensure this path is correct

router.post('/email-check', authController.emailCheck);
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/resend-otp', authController.resendOtp);

module.exports = router;
