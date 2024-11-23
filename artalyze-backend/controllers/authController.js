const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
require('dotenv').config();

const otpStore = {};

// Function to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Check if email exists and prompt appropriately
exports.emailCheck = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: 'Email exists, please enter your password', requiresPassword: true });
    }
    return res.status(200).json({ message: 'Email not found, proceed with registration', requiresPassword: false });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ message: 'Server error during email check' });
  }
};

// Generate and send OTP for email verification
exports.requestOtp = async (req, res) => {
  const { email } = req.body;
  console.log("OTP request received for email:", email); // Log incoming OTP request
  try {
    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10-minute expiry

    console.log("Generated OTP:", otp, "for email:", email); // Log generated OTP

    // Send OTP email
    await sendEmail(
      email,
      'Your Artalyze Verification Code',
      otp
    );

    console.log("OTP sent successfully to email:", email); // Log successful email send
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};


// Verify OTP
exports.verifyOtp = (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore[email];

  if (storedOtp && storedOtp.otp === otp && Date.now() < storedOtp.expiresAt) {
    delete otpStore[email];
    return res.status(200).json({ message: 'OTP verified' });
  }
  res.status(400).json({ message: 'Invalid or expired OTP' });
};

// Register user after OTP verification
exports.registerUser = async (req, res) => {
  console.log("Received data:", req.body);
  try {
    const { email, password, firstName, lastName } = req.body; // Include firstName and lastName here

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Email, password, first name, and last name are required' });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with firstName and lastName
    const newUser = new User({ email, password: hashedPassword, firstName, lastName });
    await newUser.save();

    // Generate a JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    res.status(201).json({ token, user: { email: newUser.email, firstName, lastName } });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ token, user: { email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout
exports.logoutUser = (req, res) => res.status(200).json({ message: "Logged out successfully" });

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;
  console.log("Resend OTP request received for email:", email); // Log incoming Resend OTP request

  try {
    // Check if the user is in OTP store (since they're not yet registered)
    const existingOtp = otpStore[email];
    if (!existingOtp) {
      console.log("No OTP found for email (invalid resend request):", email);
      return res.status(404).json({ message: 'No OTP request found for this email.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10-minute expiry

    console.log("Resent OTP:", otp, "for email:", email); // Log resent OTP

    // Send OTP email
    await sendEmail(
      email,
      'Your Artalyze Verification Code (Resend)',
      otp
    );

    console.log("OTP resent successfully to email:", email); // Log successful resend
    res.status(200).json({ message: 'OTP resent to email successfully.' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
};
