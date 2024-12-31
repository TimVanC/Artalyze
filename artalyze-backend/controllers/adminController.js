// controllers/adminController.js

const ImagePair = require('../models/ImagePairs');
const path = require('path');
const fs = require('fs');

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
  const { date } = req.params;

  try {
    const imagePair = await ImagePair.findOne({ date });
    if (!imagePair) {
      return res.status(404).json([]);
    }

    res.status(200).json(imagePair.pairs);
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ message: 'Failed to fetch image pairs' });
  }
};