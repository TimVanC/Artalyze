const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Stats = require('../models/Stats'); // Assuming Stats is a model for user statistics
const sendEmail = require('../utils/emailService');
require('dotenv').config();

const otpStore = {};

// Function to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Middleware for authenticating JWT and attaching user to the request
exports.authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach userId to the request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized access' });
  }
};

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
      'account-verification', // Email type
      { otp, expiry: 10 } // Dynamic data for the template
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
  try {
    const { email, password, firstName, lastName } = req.body;

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

    // Create new user
    const newUser = new User({ email, password: hashedPassword, firstName, lastName });
    await newUser.save();

    // Initialize user stats upon registration
    const userStats = new Stats({
      userId: newUser._id,
      gamesPlayed: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      perfectPuzzles: 0,
      mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    await userStats.save();

    // Generate a JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    // Include userId in the response
    res.status(201).json({
      token,
      user: {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userId: newUser._id // Include userId
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Login user
// Assuming you have a function to store this in localStorage
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ token, user: { email: user.email, firstName: user.firstName, lastName: user.lastName, userId: user._id } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout
exports.logoutUser = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};


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
  console.log("Resend OTP request received for email:", email);

  try {
    const existingOtp = otpStore[email];
    if (!existingOtp) {
      console.log("No OTP found for email:", email);
      return res.status(404).json({ message: 'No OTP request found for this email.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10-minute expiry

    console.log("Resent OTP:", otp, "for email:", email);

    // Send OTP email
    await sendEmail(
      email,
      'Your Artalyze Verification Code (Resend)',
      'account-verification', // Email type
      { otp, expiry: 10 } // Dynamic data for the template
    );
    

    console.log("OTP resent successfully to email:", email);
    res.status(200).json({ message: 'OTP resent to email successfully.' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // OTP valid for 10 minutes

    // Send OTP email for password reset
    await sendEmail(
      email,
      'Reset Your Artalyze Password',
      'reset-password', // The email type
      { otp, expiry: 10 } // Dynamic data for the template
    );
    

    res.status(200).json({ message: 'OTP sent to your email for password reset' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Error sending password reset OTP' });
  }
};

// Verify OTP for Reset Password
exports.verifyResetOtp = (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore[email];

  if (storedOtp && storedOtp.otp === otp && Date.now() < storedOtp.expiresAt) {
    delete otpStore[email];
    return res.status(200).json({ message: 'OTP verified for password reset' });
  }
  res.status(400).json({ message: 'Invalid or expired OTP' });
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  const { userId } = req.user;

  try {
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account Deletion Error:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
};
