// controllers/adminController.js

const ImagePair = require('../models/ImagePair');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  
  // Load admin credentials from .env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
  );

  res.json({ token });
};

// Upload image pairs for a specific day
exports.uploadDayPuzzle = async (req, res) => {
  const { date } = req.body;
  const pairs = [];
  
  // Process image pairs from the formData
  for (let i = 0; i < 5; i++) {
    if (req.files[`human${i}`] && req.files[`ai${i}`]) {
      const humanImage = req.files[`human${i}`][0];
      const aiImage = req.files[`ai${i}`][0];

      const humanImageURL = `/uploads/${humanImage.filename}`;
      const aiImageURL = `/uploads/${aiImage.filename}`;

      pairs.push({ humanImageURL, aiImageURL });
    }
  }

  if (pairs.length === 0) {
    return res.status(400).json({ message: 'No image pairs provided' });
  }

  try {
    let existingPair = await ImagePair.findOne({ date });

    if (existingPair) {
      existingPair.pairs = pairs;
      await existingPair.save();
    } else {
      await ImagePair.create({ date, pairs });
    }

    res.status(200).json({ message: 'Image pairs uploaded successfully' });
  } catch (error) {
    console.error('Error uploading image pairs:', error);
    res.status(500).json({ message: 'Failed to upload image pairs' });
  }
};

// Get image pairs by date
exports.getImagePairsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Convert the date string to a proper UTC date range
    const queryStart = new Date(date);
    queryStart.setUTCHours(0, 0, 0, 0); // Start of day UTC

    const queryEnd = new Date(queryStart);
    queryEnd.setUTCHours(23, 59, 59, 999); // End of day UTC

    // Find image pairs within this date range
    const imagePair = await ImagePair.findOne({
      scheduledDate: { $gte: queryStart, $lte: queryEnd }
    });

    if (!imagePair) {
      return res.status(404).json({ error: 'No image pairs found for this date' });
    }

    res.status(200).json(imagePair.pairs);
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ message: 'Failed to fetch image pairs' });
  }
};