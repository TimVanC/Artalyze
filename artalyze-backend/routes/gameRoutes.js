const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Game routes
router.get('/test', (req, res) => {
  res.send('Game Routes are working!');
});

// Fetch today's puzzle image pairs for the game
router.get('/daily-puzzle', gameController.getDailyPuzzle);

// Check if the user has already played today's puzzle
router.get('/check-today-status', gameController.checkIfPlayedToday);

// Record that the user has completed today's puzzle
router.post('/mark-as-played', authMiddleware.authenticateToken, gameController.markAsPlayedToday);

// Handle undefined routes
router.use('*', (req, res) => {
  res.status(404).json({ message: `No route found for ${req.originalUrl}` });
});

module.exports = router;
