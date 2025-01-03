const User = require('../models/User');
const ImagePair = require('../models/ImagePair');
const Stats = require('../models/Stats');
const { getTodayInEST } = require('../utils/dateUtils');

// GET endpoint to fetch the image pairs for today's puzzle
exports.getDailyPuzzle = async (req, res) => {
  console.log('getDailyPuzzle called');
  try {
    const todayInEST = getTodayInEST();

    console.log("Today's Date (EST):", todayInEST);

    const dailyPuzzle = await ImagePair.findOne({ scheduledDate: todayInEST });

    if (dailyPuzzle) {
      console.log('Found Daily Puzzle:', dailyPuzzle);
      res.status(200).json({ imagePairs: dailyPuzzle.pairs });
    } else {
      console.log('No daily puzzle found for today.');
      res.status(404).json({ message: 'Daily puzzle not found' });
    }
  } catch (error) {
    console.error('Error fetching daily puzzle:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if the user has played today
exports.checkIfPlayedToday = async (req, res) => {
  try {
    const { userId } = req.user; // Get the authenticated user's ID
    const todayInEST = getTodayInEST(); // Get today's date in EST format

    const stats = await Stats.findOne({ userId });
    if (!stats || stats.lastPlayedDate !== todayInEST) {
      // User has not played today
      return res.status(200).json({ hasPlayedToday: false });
    }

    // User has already played today
    return res.status(200).json({ hasPlayedToday: true });
  } catch (error) {
    console.error('Error checking if user has played today:', error);
    return res.status(500).json({ message: 'Failed to check play status.' });
  }
};

// Mark the user as played today
exports.markAsPlayedToday = async (req, res) => {
  console.log('markAsPlayedToday called');
  try {
    const userId = req.user.userId;
    const { isPerfectPuzzle } = req.body; // Include this in the request body
    const todayInEST = getTodayInEST();

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      // Create a new stats document for the user
      await Stats.create({
        userId,
        lastPlayedDate: todayInEST,
        currentStreak: isPerfectPuzzle ? 1 : 0,
        maxStreak: isPerfectPuzzle ? 1 : 0,
      });

      return res.status(200).json({ message: 'User play status created successfully' });
    }

    // Update stats based on whether the game was perfect
    if (stats.lastPlayedDate === getYesterdayInEST()) {
      stats.currentStreak += 1;
    } else if (stats.lastPlayedDate !== todayInEST) {
      stats.currentStreak = isPerfectPuzzle ? 1 : 0;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastPlayedDate = todayInEST;

    await stats.save();

    console.log('User play status and streak updated successfully.');
    res.status(200).json({ message: 'User play status and streak updated successfully' });
  } catch (error) {
    console.error('Error updating play status and streak:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
