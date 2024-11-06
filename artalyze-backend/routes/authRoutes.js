const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Make sure this path is correct

router.post('/email-check', authController.emailCheck);
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

module.exports = router;
