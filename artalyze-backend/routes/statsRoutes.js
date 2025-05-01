const express = require('express');
const router = express.Router();
const { 
  getUserStats, 
  updateUserStats, 
  getTriesRemaining, 
  decrementTries, 
  getSelections, 
  saveSelections, 
  getCompletedSelections, 
  saveCompletedSelections, 
  resetTries,
  saveAlreadyGuessed,
  saveAttempts, 
  saveCompletedAttempts 
} = require('../controllers/statsController');

const { authenticateToken } = require('../middleware/authMiddleware');

// Protect all stats routes
router.use(authenticateToken);

// Game attempt routes
router.get('/tries', getTriesRemaining);
router.put('/tries/decrement', decrementTries);
router.put('/tries/reset', resetTries);

// Selection routes
router.get('/selections', getSelections); 
router.put('/selections', saveSelections); 
router.get('/completed-selections', getCompletedSelections); 
router.put('/completed-selections/:userId', saveCompletedSelections);

// Attempt tracking routes
router.put("/attempts", saveAttempts);
router.put("/completed-attempts", saveCompletedAttempts);
router.put("/already-guessed", saveAlreadyGuessed);

// User stats routes
router.get('/:userId', getUserStats);
router.put('/:userId', updateUserStats);

module.exports = router;
