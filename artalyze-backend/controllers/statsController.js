const Stats = require('../models/Stats');
const { getTodayInEST, getYesterdayInEST } = require('../utils/dateUtils');

// Fetch user statistics
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await Stats.findOne({ userId });
    if (!stats) {
      return res.status(404).json({ message: 'Statistics not found for this user.' });
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error while fetching statistics.' });
  }
};

// Update user statistics
exports.updateUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { correctAnswers, totalQuestions } = req.body;

    const todayInEST = getTodayInEST();
    const yesterdayInEST = new Date(new Date().setDate(new Date().getDate() - 1))
      .toLocaleDateString("en-US", { timeZone: "America/New_York" })
      .split("/")
      .reverse()
      .join("-");

    const stats = await Stats.findOne({ userId });

    let updates = {};
    let currentStreak = stats?.currentStreak || 0;
    let maxStreak = stats?.maxStreak || 0;
    let perfectStreak = stats?.perfectStreak || 0;
    let maxPerfectStreak = stats?.maxPerfectStreak || 0;

    // Determine if the game was perfect
    const isPerfectGame = correctAnswers === totalQuestions;

    if (stats) {
      // Existing stats document: update streaks based on lastPlayedDate
      if (stats.lastPlayedDate === yesterdayInEST) {
        currentStreak += 1;
        maxStreak = Math.max(maxStreak, currentStreak);

        if (isPerfectGame) {
          perfectStreak += 1;
          maxPerfectStreak = Math.max(maxPerfectStreak, perfectStreak);
        } else {
          perfectStreak = 0; // Reset perfect streak if not perfect
        }
      } else if (stats.lastPlayedDate !== todayInEST) {
        // New day but not consecutive
        currentStreak = 1;
        perfectStreak = isPerfectGame ? 1 : 0;
      }
    } else {
      // No stats document exists; create new stats
      currentStreak = 1;
      maxStreak = 1;
      perfectStreak = isPerfectGame ? 1 : 0;
      maxPerfectStreak = isPerfectGame ? 1 : 0;
    }

    // Increment games played and update mistake distribution
    updates.$inc = {
      gamesPlayed: 1,
      [`mistakeDistribution.${totalQuestions - correctAnswers}`]: 1,
    };

    if (isPerfectGame) {
      updates.$inc.perfectPuzzles = 1;
    }

    // Update streaks, lastPlayedDate, and mostRecentScore
    updates.$set = {
      currentStreak,
      maxStreak,
      perfectStreak,
      maxPerfectStreak,
      lastPlayedDate: todayInEST,
      mostRecentScore: totalQuestions - correctAnswers,
    };

    // Calculate win percentage
    const gamesPlayed = stats ? stats.gamesPlayed + 1 : 1;
    const perfectPuzzles = stats ? (stats.perfectPuzzles || 0) + (isPerfectGame ? 1 : 0) : (isPerfectGame ? 1 : 0);
    updates.$set.winPercentage = Math.round((perfectPuzzles / gamesPlayed) * 100);

    const updatedStats = await Stats.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );

    res.status(200).json(updatedStats);
  } catch (error) {
    console.error("Error updating stats:", error);
    res.status(500).json({ message: "Failed to update stats." });
  }
};



// Reset all user statistics
exports.resetUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required to reset stats.' });
    }

    const resetStats = {
      gamesPlayed: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      perfectPuzzles: 0,
      currentPerfectStreak: 0,
      maxPerfectStreak: 0,
      mistakeDistribution: {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
      mostRecentScore: null,
      lastPlayedDate: null,
    };

    const updatedStats = await Stats.findOneAndUpdate(
      { userId },
      { $set: resetStats },
      { new: true }
    );

    res.status(200).json(updatedStats);
  } catch (error) {
    console.error('Error resetting stats:', error);
    res.status(500).json({ message: 'Failed to reset stats.' });
  }
};

// Delete user statistics
exports.deleteUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required to delete stats.' });
    }

    await Stats.findOneAndDelete({ userId });

    res.status(200).json({ message: 'User stats deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user stats:', error);
    res.status(500).json({ message: 'Failed to delete stats.' });
  }
};

// Fetch triesRemaining
exports.getTriesRemaining = async (req, res) => {
  try {
    const { userId } = req.user;
    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    res.status(200).json({ triesRemaining: stats.triesRemaining });
  } catch (error) {
    console.error('Error fetching triesRemaining:', error);
    res.status(500).json({ message: 'Failed to fetch triesRemaining.' });
  }
};

// Decrement triesRemaining
exports.decrementTries = async (req, res) => {
  try {
    const { userId } = req.user;

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $inc: { triesRemaining: -1 } },
      { new: true }
    );

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    res.status(200).json({ triesRemaining: stats.triesRemaining });
  } catch (error) {
    console.error('Error decrementing triesRemaining:', error);
    res.status(500).json({ message: 'Failed to decrement triesRemaining.' });
  }
};

// Reset triesRemaining at midnight
exports.resetTries = async (req, res) => {
  try {
    const { userId } = req.user;

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $set: { triesRemaining: 3 } },
      { new: true }
    );

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for user.' });
    }

    res.status(200).json({ triesRemaining: stats.triesRemaining });
  } catch (error) {
    console.error('Error resetting triesRemaining:', error);
    res.status(500).json({ message: 'Failed to reset triesRemaining.' });
  }
};

// Fetch selections
exports.getSelections = async (req, res) => {
  try {
    const { userId } = req.user;
    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    res.status(200).json({ selections: stats.selections });
  } catch (error) {
    console.error('Error fetching selections:', error);
    res.status(500).json({ message: 'Failed to fetch selections.' });
  }
};

// Save selections
exports.saveSelections = async (req, res) => {
  try {
    const { userId } = req.user;
    const { selections } = req.body;

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $set: { selections } },
      { new: true, upsert: true }
    );

    res.status(200).json({ selections: stats.selections });
  } catch (error) {
    console.error('Error saving selections:', error);
    res.status(500).json({ message: 'Failed to save selections.' });
  }
};
