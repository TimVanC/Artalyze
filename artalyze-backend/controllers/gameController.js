const User = require('../models/User');
const ImagePair = require('../models/ImagePair');
const Stats = require('../models/Stats');
const { getTodayInEST, getYesterdayInEST } = require('../utils/dateUtils');

// GET endpoint to fetch the image pairs for today's puzzle
exports.getDailyPuzzle = async (req, res) => {
  console.log('getDailyPuzzle called');
  try {
    const todayInEST = getTodayInEST();
    console.log("Today's Date (EST):", todayInEST);

    // Convert EST date to correct UTC range
    const startOfDayUTC = new Date(`${todayInEST}T05:00:00Z`); // Midnight EST = 5 AM UTC
    const endOfDayUTC = new Date(new Date(`${todayInEST}T05:00:00Z`).getTime() + 24 * 60 * 60 * 1000 - 1); // 24 hours later - 1 ms

    console.log('Start of Day UTC:', startOfDayUTC);
    console.log('End of Day UTC:', endOfDayUTC);

    // Query MongoDB for puzzles within the UTC range
    const dailyPuzzle = await ImagePair.findOne({
      scheduledDate: { $gte: startOfDayUTC, $lte: endOfDayUTC },
    });

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

