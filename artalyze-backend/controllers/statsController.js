const Stats = require('../models/Stats');
const { getTodayInEST, getYesterdayInEST } = require('../utils/dateUtils');

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`Fetching stats for userId: ${userId}`);

    if (!userId) {
      console.error("Error: userId is missing in request params.");
      return res.status(400).json({ message: "User ID is required." });
    }

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      console.warn(`Stats not found for userId: ${userId}`);
      return res.status(404).json({ message: "Statistics not found for this user." });
    }

    console.log("Stats fetched from database:", stats);

    res.status(200).json({
      ...stats.toObject(),
      completedSelections: stats.completedSelections || [],
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Failed to fetch user stats." });
  }
};


exports.updateUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { correctAnswers, totalQuestions, completedSelections } = req.body;

    console.log(`Updating stats for userId: ${userId}`);
    console.log("Received payload:", { correctAnswers, totalQuestions, completedSelections });

    if (
      correctAnswers === undefined ||
      totalQuestions === undefined ||
      !Array.isArray(completedSelections)
    ) {
      console.error("Invalid payload. Missing required fields or incorrect format.");
      return res.status(400).json({
        message: "Invalid payload: correctAnswers, totalQuestions, and completedSelections are required.",
      });
    }

    let stats = await Stats.findOne({ userId });

    if (!stats) {
      console.error(`Stats not found for userId: ${userId}`);
      return res.status(404).json({ message: "Stats not found for this user." });
    }

    console.log("Stats before update:", stats);

    // Update stats only if values are valid
    stats.completedSelections = completedSelections;
    stats.lastPlayedDate = getTodayInEST();
    stats.gamesPlayed += 1;
    stats.mostRecentScore = correctAnswers;

    if (totalQuestions > 0) {
      stats.winPercentage = ((correctAnswers / totalQuestions) * 100).toFixed(2);
    }

    console.log("Stats before save:", stats);

    // Save the stats back to the database
    const savedStats = await stats.save();
    console.log("Saved stats in database:", savedStats);

    res.status(200).json(savedStats);
  } catch (error) {
    console.error("Error updating user stats:", error);
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

// Fetch selections
exports.getSelections = async (req, res) => {
  try {
    const { userId } = req.user; // Ensure userId is attached
    const stats = await Stats.findOne({ userId });
    if (!stats) {
      console.log(`No stats found for userId: ${userId}`);
      return res.status(404).json({ message: 'Stats not found for this user.' });
    }

    console.log(`Selections for userId ${userId}:`, stats.selections);
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

    console.log('saveSelections called');
    console.log('Received userId:', userId);
    console.log('Received selections:', selections);

    // Validate selections
    if (!Array.isArray(selections)) {
      console.error('Invalid selections format:', selections);
      return res.status(400).json({ message: 'Selections must be an array.' });
    }

    // Update database
    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $set: { selections } },
      { new: true, upsert: true } // Create document if it doesn't exist
    );

    console.log('Updated stats:', stats);

    res.status(200).json({ selections: stats.selections });
  } catch (error) {
    console.error('Error saving selections:', error);
    res.status(500).json({ message: 'Failed to save selections.' });
  }
};

// Fetch completedSelections
exports.getCompletedSelections = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      console.error("Error: userId is missing in request.");
      return res.status(400).json({ message: "User ID is required." });
    }

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      console.warn(`No stats found for userId: ${userId}`);
      return res.status(404).json({ message: "Stats not found for this user." });
    }

    console.log(`CompletedSelections for userId ${userId}:`, stats.completedSelections || []);

    res.status(200).json({
      completedSelections: stats.completedSelections || [],
    });
  } catch (error) {
    console.error("Error fetching completedSelections:", error);
    res.status(500).json({ message: "Failed to fetch completedSelections." });
  }
};


// Save completedSelections
exports.saveCompletedSelections = async (req, res) => {
  try {
    const { userId } = req.user;
    const { completedSelections } = req.body;

    console.log("saveCompletedSelections called");
    console.log("Received userId:", userId);
    console.log("Received completedSelections:", completedSelections);

    if (!userId) {
      console.error("Error: userId is missing in request.");
      return res.status(400).json({ message: "User ID is required." });
    }

    if (!Array.isArray(completedSelections)) {
      console.error("Invalid completedSelections format:", completedSelections);
      return res.status(400).json({ message: "completedSelections must be an array." });
    }

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $set: { completedSelections } },
      { new: true, upsert: true }
    );

    if (!stats) {
      console.error(`Error updating stats for userId: ${userId}`);
      return res.status(500).json({ message: "Failed to update completedSelections." });
    }

    console.log("Updated stats with completedSelections:", stats);

    res.status(200).json({ completedSelections: stats.completedSelections || [] });
  } catch (error) {
    console.error("Error saving completedSelections:", error);
    res.status(500).json({ message: "Failed to save completedSelections." });
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

