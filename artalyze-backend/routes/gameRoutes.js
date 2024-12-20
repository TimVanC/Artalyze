const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('Initializing gameRoutes');

// Test route to confirm game routes are working
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.send('Game Routes are working!');
});

// GET endpoint to fetch the image pairs for today's puzzle
router.get('/daily-puzzle', async (req, res) => {
  console.log('Received request for /daily-puzzle');
  await gameController.getDailyPuzzle(req, res);
});

// GET endpoint to check if the user has played today (requires authentication)
router.get(
  '/check-today-status',
  authMiddleware.authenticateToken,
  async (req, res) => {
    console.log('Received request for /check-today-status');
    await gameController.checkIfPlayedToday(req, res);
  }
);

// POST endpoint to mark the user as played today (requires authentication)
router.post(
  '/mark-as-played',
  authMiddleware.authenticateToken,
  async (req, res) => {
    console.log('Received request for /mark-as-played');
    await gameController.markAsPlayedToday(req, res);
  }
);

// Middleware for unhandled routes
router.use('*', (req, res) => {
  console.log(`Unhandled request to: ${req.originalUrl}`);
  res.status(404).json({ message: `No route found for ${req.originalUrl}` });
});

module.exports = router;
