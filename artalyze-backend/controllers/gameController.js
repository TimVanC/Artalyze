const User = require('../models/User');
const ImagePair = require('../models/ImagePair');
const Stats = require('../models/Stats');
const { getTodayInEST, getYesterdayInEST } = require('../utils/dateUtils');

// Get today's puzzle pairs
exports.getDailyPuzzle = async (req, res) => {
  try {
    // Get current date in UTC and set to start/end of day EST
    const startOfDay = new Date();
    startOfDay.setUTCHours(5, 0, 0, 0); // 5 AM UTC = midnight EST

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(28, 59, 59, 999); // Next day 4:59:59 AM UTC = 11:59:59 PM EST

    console.log('Searching for pairs between:', startOfDay, 'and', endOfDay);

    // Find today's pairs using date range
    const todaysPairs = await ImagePair.findOne({
      scheduledDate: { 
        $gte: startOfDay,
        $lte: endOfDay
      },
      'pairs.0': { $exists: true } // Ensure there are completed pairs
    });

    if (!todaysPairs || !todaysPairs.pairs.length) {
      console.log('No pairs found for today');
      return res.status(404).json({ 
        error: 'No puzzles available for today',
        message: 'Please check back later!'
      });
    }

    console.log('Found pairs:', todaysPairs.pairs.length);

    // Return only the image URLs, not the entire document
    const puzzles = todaysPairs.pairs.map(pair => ({
      humanImageURL: pair.humanImageURL,
      aiImageURL: pair.aiImageURL
    }));

    res.json({ imagePairs: puzzles });
  } catch (error) {
    console.error('Error fetching daily puzzle:', error);
    res.status(500).json({ error: 'Failed to fetch daily puzzle' });
  }
};


// Check if the user has played today
exports.checkIfPlayedToday = async (req, res) => {
  try {
    const todayInEST = getTodayInEST();

    // ✅ If user is logged in, check database
    if (req.user) {
      const { userId } = req.user;
      let stats = await Stats.findOne({ userId });

      if (!stats) {
        stats = new Stats({
          userId,
          triesRemaining: 3,
          lastPlayedDate: todayInEST,
        });
        await stats.save();
        return res.status(200).json({
          hasPlayedToday: false,
          triesRemaining: stats.triesRemaining,
        });
      }

      return res.status(200).json({
        hasPlayedToday: stats.lastPlayedDate === todayInEST,
        triesRemaining: stats.triesRemaining,
      });
    }

    // ✅ Guest logic (Use `localStorage` equivalent if needed)
    const guestLastPlayed = req.cookies?.guestLastPlayed || null;
    const hasPlayedToday = guestLastPlayed === todayInEST;

    return res.status(200).json({
      hasPlayedToday,
      triesRemaining: hasPlayedToday ? 0 : 3, // Guests reset tries daily
    });
  } catch (error) {
    console.error('Error checking if user has played today:', error);
    return res.status(500).json({ message: 'Failed to check play status.' });
  }
};


// Mark the user as played today
exports.markAsPlayedToday = async (req, res) => {
  console.log('markAsPlayedToday called');
  try {
    const { userId } = req.user;
    const { isPerfectPuzzle } = req.body;

    const todayInEST = getTodayInEST();
    const yesterdayInEST = getYesterdayInEST();

    // Retrieve and update stats for the user
    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    let currentStreak = stats.currentStreak || 0;
    let perfectStreak = stats.perfectStreak || 0;

    if (stats.lastPlayedDate === yesterdayInEST) {
      // Increment streaks for consecutive days
      currentStreak += 1;
      if (isPerfectPuzzle) {
        perfectStreak += 1;
      } else {
        perfectStreak = 0; // Reset perfect streak if not a perfect game
      }
    } else if (stats.lastPlayedDate !== todayInEST) {
      // Reset streaks for non-consecutive play
      currentStreak = 1;
      perfectStreak = isPerfectPuzzle ? 1 : 0;
    }

    stats.lastPlayedDate = todayInEST;
    stats.currentStreak = currentStreak;
    stats.perfectStreak = perfectStreak;

    await stats.save();

    console.log('Play status and streaks updated:', { currentStreak, perfectStreak });
    res.status(200).json({ message: 'Play status and streaks updated successfully.' });
  } catch (error) {
    console.error('Error updating play status and streak:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

