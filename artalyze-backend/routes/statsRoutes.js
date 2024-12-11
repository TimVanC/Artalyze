const express = require('express');
const router = express.Router();
const { getUserStats, updateUserStats } = require('../controllers/statsController');

// Route to fetch stats
router.get('/:userId', getUserStats);

// Route to update stats
router.put('/:userId', updateUserStats);

module.exports = router;
