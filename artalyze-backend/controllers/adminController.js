// controllers/adminController.js

const ImagePair = require('../models/ImagePairs');
const path = require('path');
const fs = require('fs');

// Upload image pairs for a specific day
exports.uploadDayPuzzle = async (req, res) => {
  try {
    const { scheduledDate, pairIndex } = req.body;

    console.log('Received Scheduled Date (Raw):', scheduledDate);

    const parsedDate = new Date(scheduledDate);
    console.log('Parsed Scheduled Date (UTC):', parsedDate.toISOString());

    // Validate the scheduled date
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid scheduled date' });
    }

    // Check if an entry for this date already exists
    let existingPair = await ImagePair.findOne({ scheduledDate: parsedDate.toISOString() });

    if (!existingPair) {
      console.log('No existing pair found. Creating a new one.');
      existingPair = new ImagePair({ scheduledDate: parsedDate.toISOString(), pairs: [] });
    }

    // Append the new pair
    const humanImageURL = `/uploads/${req.files.humanImage[0].filename}`;
    const aiImageURL = `/uploads/${req.files.aiImage[0].filename}`;

    console.log(`Pair ${pairIndex} -> Human: ${humanImageURL}, AI: ${aiImageURL}`);
    existingPair.pairs[pairIndex] = { humanImageURL, aiImageURL };

    await existingPair.save();
    console.log('Image pair saved successfully:', existingPair);

    res.status(200).json({ message: 'Image pair uploaded successfully' });
  } catch (error) {
    console.error('Error in uploadDayPuzzle:', error);
    res.status(500).json({ message: 'Failed to upload image pair' });
  }
};

// Get image pairs by date
exports.getImagePairsByDate = async (req, res) => {
  const { date } = req.params;

  try {
    const parsedDate = new Date(date);

    console.log('Parsed Date for Query (From Request):', parsedDate.toISOString());

    const startOfDayUTC = new Date(parsedDate);
    startOfDayUTC.setUTCHours(0, 0, 0, 0);

    const endOfDayUTC = new Date(startOfDayUTC);
    endOfDayUTC.setUTCHours(23, 59, 59, 999);

    console.log('Searching Between:', startOfDayUTC.toISOString(), 'and', endOfDayUTC.toISOString());

    const imagePair = await ImagePair.findOne({
      scheduledDate: {
        $gte: startOfDayUTC.toISOString(),
        $lte: endOfDayUTC.toISOString(),
      },
    });

    if (!imagePair) {
      console.log('No image pairs found for this date range.');
      return res.status(404).json([]);
    }

    console.log('Image Pairs Found:', imagePair.pairs);
    res.status(200).json(imagePair.pairs);
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ message: 'Failed to fetch image pairs' });
  }
};

