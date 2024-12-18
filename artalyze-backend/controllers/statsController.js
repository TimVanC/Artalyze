const Stats = require('../models/Stats');

// Fetch user statistics
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

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

    if (!userId || correctAnswers == null || totalQuestions == null) {
      return res
        .status(400)
        .json({ message: 'User ID, correctAnswers, and totalQuestions are required.' });
    }

    const mistakes = totalQuestions - correctAnswers;

    const updatedStats = await Stats.findOneAndUpdate(
      { userId },
      {
        $inc: {
          gamesPlayed: 1,
          [`mistakeDistribution.${mistakes}`]: 1,
        },
        $set: {
          lastPlayedDate: new Date().toISOString(),
          mostRecentScore: mistakes,
        },
      },
      { new: true, upsert: true }
    );


    res.status(200).json(updatedStats);
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ message: 'Failed to update stats.' });
  }
};

// Reset all user statistics (optional utility function)
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

// Delete user statistics (optional utility function)
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
