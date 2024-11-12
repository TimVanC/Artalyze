// routes/adminRoutes.js

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ImagePair = require('../models/ImagePair');
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
    const { humanImage, aiImage } = req.files;
    const { scheduledDate, pairIndex } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ error: 'Scheduled date must be provided.' });
    }

    const date = new Date(scheduledDate);

    // Check if an image pair for the specified date and pair index exists
    const existingPair = await ImagePair.findOne({ scheduledDate: date, pairIndex });

    // Upload images to Cloudinary
    let humanUploadResult, aiUploadResult;
    if (humanImage) {
      humanUploadResult = await uploadToCloudinary(humanImage[0].buffer, 'artalyze/humanImages');
    }
    if (aiImage) {
      aiUploadResult = await uploadToCloudinary(aiImage[0].buffer, 'artalyze/aiImages');
    }

    if (existingPair) {
      // Update existing pair
      if (humanUploadResult) existingPair.humanImageURL = humanUploadResult.secure_url;
      if (aiUploadResult) existingPair.aiImageURL = aiUploadResult.secure_url;

      await existingPair.save();
      res.json({ message: 'Image pair updated successfully', data: existingPair });
    } else {
      // Create new pair
      if (!humanUploadResult || !aiUploadResult) {
        return res.status(400).json({ error: 'Both images must be provided for new pair creation.' });
      }

      const newImagePair = new ImagePair({
        humanImageURL: humanUploadResult.secure_url,
        aiImageURL: aiUploadResult.secure_url,
        scheduledDate: date,
        pairIndex,
        status: 'pending',
      });

      await newImagePair.save();
      res.json({ message: 'Image pair uploaded successfully', data: newImagePair });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image pair' });
  }
});

// PUT endpoint to update either the human or AI image of an image pair
router.put('/update-image-pair/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // Type should be either 'human' or 'ai'

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Upload new image to Cloudinary
    const folderName = type === 'human' ? 'artalyze/humanImages' : 'artalyze/aiImages';
    const uploadResult = await uploadToCloudinary(req.file.buffer, folderName);

    // Update the specific image in the database
    const updateData = type === 'human' ? { humanImageURL: uploadResult.secure_url } : { aiImageURL: uploadResult.secure_url };
    const updatedImagePair = await ImagePair.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedImagePair) {
      return res.status(404).json({ error: 'Image pair not found.' });
    }

    res.json({ message: 'Image updated successfully', data: updatedImagePair });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// GET endpoint to retrieve image pairs for a specific date
router.get('/get-image-pairs-by-date/:scheduledDate', async (req, res) => {
  try {
    const { scheduledDate } = req.params;
    const selectedDate = new Date(scheduledDate);

    // Set start and end of the selected day
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Query the image pairs that fall within the start and end of the day
    const imagePairs = await ImagePair.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (imagePairs.length === 0) {
      res.status(404).json({ message: 'No existing image pairs found for this date.' });
    } else {
      res.json(imagePairs);
    }
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ error: 'Failed to fetch image pairs' });
  }
});

module.exports = router;
