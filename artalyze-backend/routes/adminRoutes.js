// routes/adminRoutes.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ImagePair = require('../models/ImagePair');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const router = express.Router();
const streamifier = require('streamifier');

// Multer setup for file handling (store in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary setup (ensure environment variables are configured)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload to Cloudinary using a buffer stream
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// POST endpoint for uploading or updating an image pair
router.post('/upload-image-pair', upload.fields([{ name: 'humanImage' }, { name: 'aiImage' }]), async (req, res) => {
  try {
    const { scheduledDate, pairIndex } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ error: 'Scheduled date must be provided.' });
    }

    const date = new Date(scheduledDate);
    // Set to 12:00 AM EST (or EDT depending on the season)
    const isDaylightSaving = date.getMonth() >= 2 && date.getMonth() <= 10; // March to November
    if (isDaylightSaving) {
      date.setUTCHours(4, 0, 0, 0); // 4:00 AM UTC for EDT
    } else {
      date.setUTCHours(5, 0, 0, 0); // 5:00 AM UTC for EST
    }

    // Upload images to Cloudinary
    const humanImage = req.files['humanImage']?.[0];
    const aiImage = req.files['aiImage']?.[0];

    if (!humanImage || !aiImage) {
      return res.status(400).json({ error: 'Both images must be provided.' });
    }

    const humanUploadResult = await uploadToCloudinary(humanImage.buffer, 'artalyze/humanImages');
    const aiUploadResult = await uploadToCloudinary(aiImage.buffer, 'artalyze/aiImages');

    // Check if an entry for the scheduled date already exists
    let imagePairDocument = await ImagePair.findOne({ scheduledDate: date });

    if (imagePairDocument) {
      // Update an existing pair by its pair index
      if (imagePairDocument.pairs && imagePairDocument.pairs[pairIndex]) {
        imagePairDocument.pairs[pairIndex] = {
          humanImageURL: humanUploadResult.secure_url,
          aiImageURL: aiUploadResult.secure_url
        };
      } else {
        // If the pair index doesn't exist, add it as a new pair
        imagePairDocument.pairs.push({
          humanImageURL: humanUploadResult.secure_url,
          aiImageURL: aiUploadResult.secure_url
        });
      }
      
      await imagePairDocument.save();
      res.json({ message: 'Image pair updated successfully', data: imagePairDocument });
    } else {
      // Create a new entry for the date if no existing document
      imagePairDocument = new ImagePair({
        scheduledDate: date,
        pairs: [{
          humanImageURL: humanUploadResult.secure_url,
          aiImageURL: aiUploadResult.secure_url
        }],
        status: 'pending'
      });
      await imagePairDocument.save();
      res.json({ message: 'Image pair uploaded successfully', data: imagePairDocument });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image pair' });
  }
});

// GET endpoint to retrieve image pairs for a specific date
router.get('/get-image-pairs-by-date/:scheduledDate', async (req, res) => {
  try {
    const { scheduledDate } = req.params;
    console.log("Received request for image pairs on date:", scheduledDate);

    // Parse the date and normalize to UTC midnight
    const selectedDate = new Date(scheduledDate);
    selectedDate.setUTCHours(5, 0, 0, 0); // Match frontend normalization to 05:00 UTC

    console.log("Searching for image pairs with date (UTC):", selectedDate.toISOString());

    // Query the database using the normalized date
    const imagePairs = await ImagePair.findOne({ scheduledDate: selectedDate.toISOString() });

    if (!imagePairs) {
      console.log("No existing image pairs found for this date:", selectedDate.toISOString());
      res.status(404).json({ message: 'No existing image pairs found for this date.' });
    } else {
      console.log("Found image pairs:", imagePairs);
      res.status(200).json(imagePairs);
    }
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ error: 'Failed to fetch image pairs' });
  }
});



module.exports = router;