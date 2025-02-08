const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  otp: String,
  otpExpires: Date,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  lastPlayedDate: {
    type: Date, // Retain this if you want to track general user activity
    default: null,
  },
  themePreference: { type: String, enum: ['light', 'dark'], default: 'light' } // Added theme preference
});


module.exports = mongoose.model('User', UserSchema);
