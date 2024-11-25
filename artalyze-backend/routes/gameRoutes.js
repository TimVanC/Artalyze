const express = require('express');
const router = express.Router();
const ImagePair = require('../models/ImagePair'); // Assuming you have the ImagePair model set up correctly

// GET endpoint to fetch the image pairs for today's puzzle
router.get('/daily-puzzle', async (req, res) => {
  console.log('Received request for /daily-puzzle');
  try {
    // Get the current date and set it to midnight in EST/EDT
    const now = new Date();

    // Create a new date for today at local midnight
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Set to 12:00 AM EST/EDT
    const isDaylightSaving = now.getMonth() >= 2 && now.getMonth() <= 10; // March to November
    if (isDaylightSaving) {
      today.setUTCHours(4, 0, 0, 0); // 4:00 AM UTC for EDT (equivalent to 12:00 AM EST)
    } else {
      today.setUTCHours(5, 0, 0, 0); // 5:00 AM UTC for EST (equivalent to 12:00 AM EST)
    }

    // Get the Unix timestamp for this date
    const unixTimestamp = today.getTime();

    console.log("Querying for scheduledDate (Unix Timestamp):", unixTimestamp, "Readable Date:", today.toISOString());

    // Query the database with the correct timestamp
    const imagePairsDocument = await ImagePair.findOne({ scheduledDate: unixTimestamp });

    if (!imagePairsDocument || !imagePairsDocument.pairs || imagePairsDocument.pairs.length === 0) {
      console.log('No document found with scheduledDate:', unixTimestamp, '(Readable:', today.toISOString(), ')');
      return res.status(404).json({ message: 'No image pairs found for today.' });
    }

    console.log('Found Image Pairs Document:', imagePairsDocument);
    res.status(200).json({ imagePairs: imagePairsDocument.pairs });
  } catch (error) {
    console.error('Error fetching daily puzzle:', error);
    res.status(500).json({ error: 'Failed to fetch daily puzzle.' });
  }
});


module.exports = router;
