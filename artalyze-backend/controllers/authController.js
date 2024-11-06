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
    try {
      const otp = generateOTP();
      otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10-minute expiry
  
      // Send OTP email with the HTML template
      await sendEmail(
        email,
        'Your Artalyze Verification Code',
        otp // Pass the OTP to replace in the template
      );
  
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
    const { firstName, lastName, email, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ firstName, lastName, email, password: hashedPassword });
    await newUser.save();

    // Generate a JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    res.status(201).json({ token, user: { firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email } });
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
