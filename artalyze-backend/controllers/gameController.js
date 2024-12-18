const User = require('../models/User');
const ImagePair = require('../models/ImagePair');

// GET endpoint to fetch the image pairs for today's puzzle
exports.getDailyPuzzle = async (req, res) => {
  console.log('getDailyPuzzle called');
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isDaylightSaving = now.getMonth() >= 2 && now.getMonth() <= 10; // March to November

    if (isDaylightSaving) {
      today.setUTCHours(4, 0, 0, 0); // UTC 4:00 AM for EDT
    } else {
      today.setUTCHours(5, 0, 0, 0); // UTC 5:00 AM for EST
    }

    console.log("Today's Date (Adjusted to UTC Midnight):", today.toISOString());

    const dailyPuzzle = await ImagePair.findOne({ scheduledDate: today.toISOString() });

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
// Check if the user has played today
exports.checkIfPlayedToday = async (req, res) => {
  console.log('checkIfPlayedToday called');
  try {
      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const nowUTC = new Date();
      const isDaylightSaving = nowUTC.getMonth() >= 2 && nowUTC.getMonth() <= 10; // March to November
      const offset = isDaylightSaving ? -4 : -5;

      // Convert UTC to EST/EDT
      const todayEST = new Date(nowUTC.getTime() + offset * 60 * 60 * 1000);
      todayEST.setHours(0, 0, 0, 0); // Reset to midnight

      const lastPlayedUTC = user.lastPlayedDate ? new Date(user.lastPlayedDate) : null;

      console.log('Today (EST):', todayEST.toISOString());
      console.log('Last Played Date (UTC):', lastPlayedUTC);

      if (
          lastPlayedUTC &&
          todayEST.toISOString().split('T')[0] === new Date(lastPlayedUTC.getTime() + offset * 60 * 60 * 1000).toISOString().split('T')[0]
      ) {
          console.log('User has already played today.');
          return res.status(200).json({ hasPlayedToday: true });
      }

      console.log('User has not played today.');
      return res.status(200).json({ hasPlayedToday: false });
  } catch (error) {
      console.error('Error checking play status:', error);
      res.status(500).json({ message: 'Server error' });
  }
};



// Mark the user as played today
exports.markAsPlayedToday = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isPerfectPuzzle } = req.body; // Include this in the request body
    const nowUTC = new Date();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lastPlayedUTC = user.lastPlayedDate ? new Date(user.lastPlayedDate) : null;

    if (isPerfectPuzzle) {
      if (lastPlayedUTC && nowUTC - lastPlayedUTC === 86400000) {
        user.currentStreak += 1; // Increment streak
      } else {
        user.currentStreak = 1; // Reset streak
      }
      user.maxStreak = Math.max(user.maxStreak, user.currentStreak);
    } else {
      user.currentStreak = 0; // Reset streak if not solved perfectly
    }

    user.lastPlayedDate = nowUTC;
    await user.save();

    res.status(200).json({ message: 'User play status and streak updated successfully' });
  } catch (error) {
    console.error('Error updating play status and streak:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

