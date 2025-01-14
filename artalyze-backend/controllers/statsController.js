const Stats = require('../models/Stats');
const { getTodayInEST, getYesterdayInEST } = require('../utils/dateUtils');

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: 'Statistics not found for this user.' });
    }

    const todayInEST = getTodayInEST();
    const yesterdayInEST = getYesterdayInEST();

    // Reset streaks if the user missed a day
    if (stats.lastPlayedDate && stats.lastPlayedDate !== yesterdayInEST && stats.lastPlayedDate !== todayInEST) {
      stats.currentStreak = 0;
      stats.perfectStreak = 0;
      await stats.save(); // Persist changes to the database
    }

    // Ensure `mostRecentScore` is explicitly included
    const response = {
      gamesPlayed: stats.gamesPlayed || 0,
      winPercentage: stats.winPercentage || 0,
      currentStreak: stats.currentStreak || 0,
      maxStreak: stats.maxStreak || 0,
      perfectStreak: stats.perfectStreak || 0,
      maxPerfectStreak: stats.maxPerfectStreak || 0,
      perfectPuzzles: stats.perfectPuzzles || 0,
      lastPlayedDate: stats.lastPlayedDate || null,
      mostRecentScore: stats.mostRecentScore !== undefined ? stats.mostRecentScore : null, // Explicit inclusion
      mistakeDistribution: stats.mistakeDistribution || {},
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user stats.' });
  }
};



// Update user statistics
exports.updateUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { correctAnswers, totalQuestions } = req.body;

    if (correctAnswers === undefined || totalQuestions === undefined) {
      return res.status(400).json({ message: 'Invalid payload: correctAnswers and totalQuestions are required.' });
    }

    const todayInEST = getTodayInEST();
    const yesterdayInEST = getYesterdayInEST();

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    const isPerfectGame = correctAnswers === totalQuestions;

    // Reset streaks if the user missed a day
    if (stats.lastPlayedDate && stats.lastPlayedDate !== yesterdayInEST && stats.lastPlayedDate !== todayInEST) {
      stats.currentStreak = 0;
      stats.perfectStreak = 0;
    }

    // Update streaks if played consecutively
    if (stats.lastPlayedDate === yesterdayInEST) {
      stats.currentStreak += 1;
      stats.perfectStreak = isPerfectGame ? stats.perfectStreak + 1 : 0;
    } else if (stats.lastPlayedDate !== todayInEST) {
      stats.currentStreak = 1;
      stats.perfectStreak = isPerfectGame ? 1 : 0;
    }

    // Calculate the mistake count
    const mistakeCount = Math.max(totalQuestions - correctAnswers, 0);

    // Initialize mistakeDistribution if undefined
    if (!stats.mistakeDistribution) {
      stats.mistakeDistribution = {
        '0': 0,
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      };
    }

    // Update mistake distribution
    stats.mistakeDistribution[mistakeCount] =
      (stats.mistakeDistribution[mistakeCount] || 0) + 1;

    // Mark the nested field as modified
    stats.markModified('mistakeDistribution');

    // Update other stats
    stats.mostRecentScore = mistakeCount;
    stats.lastPlayedDate = todayInEST;
    stats.gamesPlayed += 1;
    stats.perfectPuzzles += isPerfectGame ? 1 : 0;
    stats.winPercentage = Math.round((stats.perfectPuzzles / stats.gamesPlayed) * 100);
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak, stats.perfectStreak);

    console.log('Updated stats:', {
      gamesPlayed: stats.gamesPlayed,
      winPercentage: stats.winPercentage,
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      perfectStreak: stats.perfectStreak,
      maxPerfectStreak: stats.maxPerfectStreak,
      mistakeDistribution: stats.mistakeDistribution,
      mostRecentScore: stats.mostRecentScore,
    });

    await stats.save();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ message: 'Failed to update stats.' });
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
