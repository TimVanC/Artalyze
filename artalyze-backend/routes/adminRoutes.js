// routes/adminRoutes.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const ImagePair = require('../models/ImagePair');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const router = express.Router();
const streamifier = require('streamifier');
const adminController = require('../controllers/adminController');
const sharp = require('sharp');
const OpenAI = require('openai');
const { generateAIImage } = require('../utils/aiGeneration');
const jwt = require('jsonwebtoken');
const { generateImageDescription, remixCaption } = require('../utils/textProcessing');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Initialize OpenAI with new SDK format
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure file upload storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Dynamically select collection name based on environment
const collectionName = process.env.NODE_ENV === "staging" ? "staging_imagePairs" : "imagePairs";
console.log('Using MongoDB collection:', collectionName);
const ImagePairCollection = mongoose.model(collectionName, ImagePair.schema);

// Ensure authentication and admin access for all routes except login
router.use((req, res, next) => {
  // Check if the path ends with /login instead of exact match
  if (req.path.endsWith('/login')) {
    return next();
  }
  authenticateToken(req, res, () => {
    authorizeAdmin(req, res, next);
  });
});

// Ensure ImagePairCollection is available to all routes
router.use((req, res, next) => {
  req.ImagePairCollection = ImagePairCollection;
  next();
});

// Verify Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary configuration');
  process.exit(1);
}

// Resize image while preserving aspect ratio
const resizeImage = async (buffer) => {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  // Only resize if width is greater than 600px
  if (metadata.width > 600) {
    return await image
      .resize(600, null, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .toBuffer();
  }
  
  return buffer;
};

// Upload file to Cloudinary
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    console.log('Starting Cloudinary upload to folder:', folderName);
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        format: "webp",
        quality: "auto:best",
        resource_type: "image",
        transformation: [
          { width: 650, crop: "scale" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload successful:', {
            publicId: result.public_id,
            url: result.secure_url,
            format: result.format,
            size: result.bytes
          });
          resolve(result);
        }
      }
    );

    // Handle stream errors
    uploadStream.on('error', (error) => {
      console.error('Cloudinary stream error:', error);
      reject(error);
    });

    uploadStream.end(fileBuffer);
  });
};

// Admin authentication
router.post('/login', adminController.adminLogin);

// Upload image pair for a date
router.post('/upload-image-pair', upload.fields([{ name: 'humanImage' }, { name: 'aiImage' }]), async (req, res) => {
  try {
    const { scheduledDate, pairIndex } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ error: 'Scheduled date must be provided.' });
    }

    // Validate that scheduledDate is not before today
    const today = new Date();
    today.setUTCHours(5, 0, 0, 0); // Set to midnight EST (5 AM UTC)
    
    const requestedDate = new Date(scheduledDate);
    requestedDate.setUTCHours(5, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({ 
        error: 'Cannot schedule image pairs for past dates. Please choose today or a future date.' 
      });
    }

    const humanImage = req.files['humanImage']?.[0];
    const aiImage = req.files['aiImage']?.[0];
    if (!humanImage || !aiImage) {
      return res.status(400).json({ error: 'Both images must be provided.' });
    }

    let humanUploadResult, aiUploadResult;
    try {
      humanUploadResult = await uploadToCloudinary(humanImage.buffer, 'artalyze/humanImages');
      aiUploadResult = await uploadToCloudinary(aiImage.buffer, 'artalyze/aiImages');
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      return res.status(500).json({ error: 'Image upload failed' });
    }

    if (!humanUploadResult?.secure_url || !aiUploadResult?.secure_url) {
      return res.status(500).json({ error: 'Failed to retrieve image URLs from Cloudinary' });
    }

    // Update the database: Use `findOneAndUpdate()` with `$push`
    const updateResult = await ImagePairCollection.findOneAndUpdate(
      { scheduledDate: requestedDate }, // Find the document by date
      {
        $push: { 
          pairs: {
            humanImageURL: humanUploadResult.secure_url,
            aiImageURL: aiUploadResult.secure_url,
          } 
        },
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Image pair uploaded successfully', data: updateResult });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image pair' });
  }
});

// Initialize global progress streams map if not exists
if (!global.progressStreams) {
  global.progressStreams = new Map();
}

// Send progress update to client
const sendProgress = (sessionId, message, type = 'info') => {
  if (global.progressStreams?.has(sessionId)) {
    try {
      const res = global.progressStreams.get(sessionId);
      res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    } catch (error) {
      console.error('Error sending progress update:', error);
    }
  }
};

// Progress updates endpoint
router.get('/progress-updates/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  
  // Get auth token from query parameter
  const token = req.query.token;
  if (!token) {
    console.error('No auth token provided');
    return res.status(401).send('No auth token provided');
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verification successful:', { userId: decoded.userId, role: decoded.role });

    if (!decoded || decoded.role !== 'admin') {
      console.error('Invalid role:', decoded.role);
      return res.status(403).send('Forbidden - Admin access required');
    }

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'staging' 
        ? 'https://staging-admin.artalyze.app'
        : process.env.ADMIN_FRONTEND_URL,
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Initialize connection
    console.log(`SSE connection established for session: ${sessionId}`);
    
    // Send initial success message
    const initialMessage = `data: ${JSON.stringify({
      type: 'info',
      message: 'SSE connection established'
    })}\n\n`;
    res.write(initialMessage);

    // Store the response object in the global map
    if (!global.progressStreams) {
      global.progressStreams = new Map();
    }
    global.progressStreams.set(sessionId, res);

    // Clean up on client disconnect
    req.on('close', () => {
      console.log(`Client disconnected: ${sessionId}`);
      if (global.progressStreams?.has(sessionId)) {
        global.progressStreams.delete(sessionId);
      }
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      if (global.progressStreams?.has(sessionId)) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          message: 'heartbeat'
        })}\n\n`);
      } else {
        clearInterval(heartbeat);
      }
    }, 15000);

    // Clean up heartbeat on disconnect
    req.on('close', () => {
      console.log(`Clearing heartbeat for ${sessionId}`);
      clearInterval(heartbeat);
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).send('Invalid or expired token');
  }
});

// Upload human image for automated pairing
router.post('/upload-human-image', upload.single('humanImage'), async (req, res) => {
  const sessionId = req.body.sessionId;
  let uploadSuccess = false;
  const totalImages = req.body.totalImages || 1;
  const currentImageIndex = req.body.currentImageIndex || 1;
  
  try {
    console.log('Starting upload process with session:', sessionId);
    
    const humanImage = req.file;
    if (!humanImage) {
      sendProgress(sessionId, 'No image file provided', 'error');
      return res.status(400).json({ error: 'Human image must be provided.' });
    }

    sendProgress(sessionId, `Processing image ${currentImageIndex}/${totalImages}: Optimizing image...`, 'info');

    try {
      // Resize image before uploading
      const resizedBuffer = await resizeImage(humanImage.buffer);
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Optimization complete`, 'success');

      // Upload to Cloudinary
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Uploading to cloud storage...`, 'info');
      const humanUploadResult = await uploadToCloudinary(resizedBuffer, 'artalyze/humanImages');
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Upload complete`, 'success');

      // Generate image description
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Analyzing artistic style...`, 'info');
      const imageAnalysis = await generateImageDescription(humanUploadResult.secure_url);
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Style analysis complete`, 'success');

      // Generate remixed prompt
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Engineering AI prompt...`, 'info');
      const { prompt: remixedPrompt, metadata } = await remixCaption(imageAnalysis);
      sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: AI prompt ready`, 'success');

      try {
        // Generate AI image
        sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Starting AI generation (typically 30-45 seconds)...`, 'info');
        const aiImageUrl = await generateAIImage(remixedPrompt, humanUploadResult.secure_url, (message) => {
          sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: ${message}`, 'info');
        });

        if (!aiImageUrl) {
          sendProgress(sessionId, 'AI generation limit reached. Please try again in a few minutes.', 'error');
          return res.status(429).json({ 
            error: 'AI image generation skipped due to API limits',
            humanImageURL: humanUploadResult.secure_url,
            description: imageAnalysis.description
          });
        }

        sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: AI generation complete`, 'success');

        // Save to database
        sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Finding optimal scheduling date...`, 'info');
        const targetDate = await findNextAvailableDate();
        sendProgress(sessionId, `Image ${currentImageIndex}/${totalImages}: Scheduled for ${targetDate.toLocaleDateString()}`, 'success');

        const imagePairDoc = await saveImagePair(
          targetDate,
          humanUploadResult.secure_url,
          aiImageUrl,
          { 
            description: imageAnalysis.description,
            styleAnalysis: imageAnalysis.styleAnalysis,
            metadata: imageAnalysis.metadata,
            remixedPrompt 
          }
        );

        uploadSuccess = true;
        if (currentImageIndex === totalImages) {
          sendProgress(sessionId, '✨ All images processed and scheduled successfully! ✨', 'success');
        } else {
          sendProgress(sessionId, `✨ Image ${currentImageIndex}/${totalImages} completed successfully! ✨`, 'success');
        }
        
        res.json({ 
          message: 'Upload complete',
          imagePair: imagePairDoc
        });

      } catch (error) {
        console.error('Error in AI generation or save:', error);
        sendProgress(sessionId, `Error: ${error.message}`, 'error');
        throw error;
      }

    } catch (error) {
      console.error('Error in image processing:', error);
      sendProgress(sessionId, `Error: ${error.message}`, 'error');
      throw error;
    }

  } catch (error) {
    console.error('Upload Error:', error);
    sendProgress(sessionId, `Failed to process image: ${error.message}`, 'error');
    
    res.status(500).json({ 
      error: error.message || 'Failed to process image pair',
      details: error.details || undefined
    });
  } finally {
    // Only close the connection if the upload was successful
    // This allows error messages to be displayed before closing
    if (uploadSuccess && global.progressStreams?.has(sessionId)) {
      setTimeout(() => {
        if (global.progressStreams?.has(sessionId)) {
          sendProgress(sessionId, 'Closing connection...', 'info');
          const stream = global.progressStreams.get(sessionId);
          stream.end();
          global.progressStreams.delete(sessionId);
        }
      }, 2000); // Give frontend time to process success message
    }
  }
});

// Helper function to find next available date
async function findNextAvailableDate() {
  const targetDate = new Date();
  targetDate.setUTCHours(5, 0, 0, 0); // Set to midnight EST

  const today = new Date();
  today.setUTCHours(5, 0, 0, 0);
  if (targetDate < today) {
    targetDate.setTime(today.getTime());
  }

  let foundDate = false;
  while (!foundDate) {
    const existingDoc = await ImagePairCollection.findOne({ 
      scheduledDate: targetDate,
      $expr: { $lt: [{ $size: "$pairs" }, 5] }
    });

    if (existingDoc || !(await ImagePairCollection.findOne({ scheduledDate: targetDate }))) {
      foundDate = true;
    } else {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  return targetDate;
}

// Helper function to save image pair
async function saveImagePair(targetDate, humanImageURL, aiImageURL, metadata) {
  return await ImagePairCollection.findOneAndUpdate(
    { scheduledDate: targetDate },
    {
      $push: {
        pairs: {
          humanImageURL,
          aiImageURL,
          metadata: {
            ...metadata,
            generatedAt: new Date()
          }
        }
      }
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

// Get image pairs for a date
router.get('/get-image-pairs-by-date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const queryStart = new Date(date);
    queryStart.setUTCHours(0, 0, 0, 0);

    const queryEnd = new Date(queryStart);
    queryEnd.setUTCHours(23, 59, 59, 999);

    // Find the image pair within this date range
    const imagePairs = await ImagePairCollection.findOne({
      scheduledDate: { $gte: queryStart, $lte: queryEnd }
    });

    if (!imagePairs) {
      return res.json({ 
        pairs: [],
        pendingHumanImages: [],
        status: 'pending'
      });
    }

    res.json(imagePairs);
  } catch (error) {
    console.error('Error fetching image pairs:', error);
    res.status(500).json({ error: 'Failed to fetch image pairs' });
  }
});

// Regenerate AI image for a pair
router.post('/regenerate-ai-image', async (req, res) => {
  console.log('Regenerate AI endpoint called with:', {
    body: req.body,
    headers: req.headers
  });
  try {
    const { pairId, scheduledDate } = req.body;
    if (!pairId || !scheduledDate) {
      return res.status(400).json({ error: 'Pair ID and scheduled date are required.' });
    }

    // Find the document for the given date
    const doc = await ImagePairCollection.findOne({ 
      scheduledDate: new Date(scheduledDate)
    });
    console.log('Found document:', doc);
    if (!doc) {
      return res.status(404).json({ error: 'No pairs found for this date.' });
    }

    // Find the specific pair using MongoDB's $elemMatch
    const pair = doc.pairs.find(p => p._id.toString() === pairId);
    console.log('Found pair:', pair);
    if (!pair) {
      return res.status(404).json({ error: 'Pair not found in the document.' });
    }

    // Generate new image description and AI image
    const imageAnalysis = await generateImageDescription(pair.humanImageURL);
    const { prompt: remixedPrompt } = await remixCaption(imageAnalysis);
    
    const newAiImageUrl = await generateAIImage(remixedPrompt, pair.humanImageURL);
    if (!newAiImageUrl) {
      return res.status(429).json({ error: 'AI image generation failed. Please try again later.' });
    }

    // Update the specific pair in the array
    const updateResult = await ImagePairCollection.findOneAndUpdate(
      { 
        scheduledDate: new Date(scheduledDate),
        'pairs._id': mongoose.Types.ObjectId(pairId)
      },
      {
        $set: {
          'pairs.$.aiImageURL': newAiImageUrl,
          'pairs.$.metadata': {
            description: imageAnalysis.description,
            styleAnalysis: imageAnalysis.styleAnalysis,
            remixedPrompt,
            regeneratedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updateResult) {
      return res.status(404).json({ error: 'Failed to update the pair.' });
    }

    res.json({ 
      message: 'AI image regenerated successfully',
      newAiImageUrl,
      pairId
    });

  } catch (error) {
    console.error('Regeneration Error:', error);
    res.status(500).json({ error: 'Failed to regenerate AI image' });
  }
});

// Delete an image pair
router.delete('/delete-pair', async (req, res) => {
  console.log('Delete pair endpoint called with:', {
    body: req.body,
    headers: req.headers
  });
  try {
    const { pairId, scheduledDate } = req.body;
    if (!pairId || !scheduledDate) {
      return res.status(400).json({ error: 'Pair ID and scheduled date are required.' });
    }

    // First check if the document exists
    const doc = await ImagePairCollection.findOne({ 
      scheduledDate: new Date(scheduledDate)
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'No pairs found for this date.' });
    }

    // Check if the pair exists before attempting to delete
    const pairExists = doc.pairs.some(p => p._id.toString() === pairId);
    if (!pairExists) {
      return res.status(404).json({ error: 'Pair not found in the document.' });
    }

    // Remove the pair using $pull
    const result = await ImagePairCollection.findOneAndUpdate(
      { scheduledDate: new Date(scheduledDate) },
      { $pull: { pairs: { _id: mongoose.Types.ObjectId(pairId) } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Failed to delete the pair.' });
    }

    res.json({ 
      message: 'Image pair deleted successfully',
      remainingPairs: result.pairs
    });

  } catch (error) {
    console.error('Deletion Error:', error);
    res.status(500).json({ error: 'Failed to delete image pair' });
  }
});

module.exports = router;
