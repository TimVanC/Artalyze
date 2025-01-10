const express = require('express');
const router = express.Router();
const { 
  getUserStats, 
  updateUserStats, 
  getTriesRemaining, 
  decrementTries, 
  getSelections, 
  saveSelections, 
  resetTries // Import resetTries
} = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware
router.use(authenticateToken);

// Route to fetch triesRemaining
router.get('/tries', getTriesRemaining);

// Route to decrement triesRemaining
router.put('/tries/decrement', decrementTries);

// Route to reset triesRemaining to 3
router.put('/tries/reset', resetTries);

// Route to fetch user selections
router.get('/selections', getSelections);

// Route to save user selections
router.put('/selections', saveSelections);

// Route to fetch user statistics
router.get('/:userId', getUserStats);

// Route to update user statistics
router.put('/:userId', updateUserStats);

module.exports = router;
