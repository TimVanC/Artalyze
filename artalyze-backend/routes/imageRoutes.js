const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads')); // Ensure the correct path to the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Ensure unique filenames by prepending timestamp
  }
});

const upload = multer({ storage: storage });

// Route to upload human and AI images
router.post('/upload', upload.fields([{ name: 'humanImages' }, { name: 'aiImages' }]), (req, res) => {
  try {
    console.log(req.files); // Log the uploaded files
    res.status(200).json({ message: 'Images uploaded successfully' });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Error uploading images' });
  }
});

// Route to fetch all uploaded images
router.get('/list', (req, res) => {
  const directoryPath = path.join(__dirname, '../uploads');

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan files');
    }

    // Send list of image files back
    res.json({ images: files });
  });
});

module.exports = router;
