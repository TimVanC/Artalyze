const express = require('express');
const router = express.Router();

// Route to fetch the image pairs for the game
router.get('/images', (req, res) => {
  // You will replace this with actual data from the database
  res.json({
    humanImages: ['human1.jpg', 'human2.jpg', 'human3.jpg'],
    aiImages: ['ai1.jpg', 'ai2.jpg', 'ai3.jpg']
  });
});

module.exports = router;
