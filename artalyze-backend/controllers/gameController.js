const User = require('../models/User');
const ImagePair = require('../models/ImagePair'); // Import ImagePair model

// GET endpoint to fetch the image pairs for today's puzzle
exports.getDailyPuzzle = async (req, res) => {
  console.log('getDailyPuzzle called');
  try {
    const now = new Date();
    // Adjust the date to reflect midnight EST/EDT
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isDaylightSaving = now.getMonth() >= 2 && now.getMonth() <= 10; // March to November
    if (isDaylightSaving) {
      today.setUTCHours(4, 0, 0, 0); // 4:00 AM UTC for EDT (equivalent to midnight EST)
    } else {
      today.setUTCHours(5, 0, 0, 0); // 5:00 AM UTC for EST (equivalent to midnight EST)
    }

    console.log("Today's Date (Adjusted to UTC Midnight):", today.toISOString());

    // Find the daily puzzle scheduled for today
    const dailyPuzzle = await ImagePair.findOne({ scheduledDate: today });

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
    const userId = req.user.userId; // Use userId from the decoded token
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the current date in UTC and set the time to midnight (UTC 00:00)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    // Get the user's lastPlayedDate
    const lastPlayedUTC = user.lastPlayedDate;

    // Check if lastPlayedDate exists and if it matches today's date (in UTC)
    if (lastPlayedUTC && lastPlayedUTC.toISOString().split('T')[0] === todayUTC.toISOString().split('T')[0]) {
      return res.status(200).json({ hasPlayedToday: true });
    }

    // If no match, the user has not played today
    return res.status(200).json({ hasPlayedToday: false });
  } catch (error) {
    console.error('Error checking play status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Mark the user as played today
exports.markAsPlayedToday = async (req, res) => {
  console.log('markAsPlayedToday called');
  try {
    const userId = req.user.userId; // Adjusted to use the correct property from req.user
    await User.findByIdAndUpdate(userId, { lastPlayedDate: new Date() });
    res.status(200).json({ message: 'User play status updated for today' });
  } catch (error) {
    console.error('Error updating play status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
