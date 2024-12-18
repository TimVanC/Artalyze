const express = require('express');
const router = express.Router();
const { getUserStats, updateUserStats } = require('../controllers/statsController');

// Route to fetch user statistics
router.get('/:userId', getUserStats);

// Route to update user statistics
router.put('/:userId', updateUserStats);

module.exports = router;
