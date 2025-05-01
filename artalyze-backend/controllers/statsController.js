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
    const todayInEST = getTodayInEST();

    console.log(`Updating stats for user: ${userId}`);
    console.log(`Received data:`, req.body);

    let stats = await Stats.findOne({ userId });

    if (!stats) {
      console.log("No stats found for user. Initializing new stats.");
      stats = new Stats({
        userId,
        gamesPlayed: 0,
        winPercentage: 0,
        currentStreak: 0,
        maxStreak: 0,
        perfectStreak: 0,
        maxPerfectStreak: 0,
        perfectPuzzles: 0,
        mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    // Update stats
    stats.gamesPlayed += 1;

    const mistakes = Math.max(totalQuestions - correctAnswers, 0); // Calculate mistakes
    stats.mostRecentScore = mistakes; // Track most recent mistake count
    stats.mistakeDistribution[mistakes] = (stats.mistakeDistribution[mistakes] || 0) + 1;
    stats.markModified("mistakeDistribution"); // Ensure nested fields are marked as modified

    console.log(`Updated mistake distribution:`, stats.mistakeDistribution);

    // Update streaks
    const isPerfectGame = correctAnswers === totalQuestions;

    if (stats.lastPlayedDate === getYesterdayInEST()) {
      stats.currentStreak += 1;
      stats.perfectStreak = isPerfectGame ? stats.perfectStreak + 1 : 0;
    } else if (stats.lastPlayedDate !== todayInEST) {
      stats.currentStreak = 1;
      stats.perfectStreak = isPerfectGame ? 1 : 0;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak, stats.perfectStreak);

    // Update perfect puzzles count
    if (isPerfectGame) {
      stats.perfectPuzzles += 1;
    }

    // Calculate win percentage
    stats.winPercentage = Math.round((stats.perfectPuzzles / stats.gamesPlayed) * 100);

    // Update last played date
    stats.lastPlayedDate = todayInEST;

    console.log("Final updated stats:", {
      gamesPlayed: stats.gamesPlayed,
      winPercentage: stats.winPercentage,
      currentStreak: stats.currentStreak,
      maxStreak: stats.maxStreak,
      perfectStreak: stats.perfectStreak,
      maxPerfectStreak: stats.maxPerfectStreak,
      perfectPuzzles: stats.perfectPuzzles,
      mistakeDistribution: stats.mistakeDistribution,
      mostRecentScore: stats.mostRecentScore,
    });

    await stats.save();
    console.log("Stats successfully saved to database.");
    res.status(200).json(stats);
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
    const { userId } = req.user;
    const todayInEST = getTodayInEST();
    const stats = await Stats.findOne({ userId });

    if (!stats) {
      return res.status(404).json({ message: "Stats not found for this user." });
    }

    // ✅ **Reset selections, attempts, completedSelections, and completedAttempts if LSMD is outdated**
    if (stats.lastSelectionMadeDate !== todayInEST) {
      console.log("LSMD is outdated. Resetting selections, attempts, completedSelections, and completedAttempts.");
      stats.selections = [];
      stats.attempts = [];
      stats.completedSelections = []; // ✅ Ensures completedSelections reset on a new day
      stats.completedAttempts = []; // ✅ Ensures completedAttempts reset on a new day
      stats.lastSelectionMadeDate = todayInEST;
      await stats.save();
    }

    console.log("✅ Returning selections, attempts, completedSelections, completedAttempts, and alreadyGuessed.");
    res.status(200).json({
      selections: stats.selections || [],
      attempts: stats.attempts || [],
      completedSelections: stats.completedSelections || [], // ✅ Now included
      completedAttempts: stats.completedAttempts || [],
      alreadyGuessed: stats.alreadyGuessed || [],
    });
  } catch (error) {
    console.error("Error fetching selections:", error);
    res.status(500).json({ message: "Failed to fetch selections." });
  }
};

// Save selections
exports.saveSelections = async (req, res) => {
  try {
    const { userId } = req.user;
    const { selections } = req.body;
    const todayInEST = getTodayInEST();

    if (!Array.isArray(selections)) {
      return res.status(400).json({ message: 'Selections must be an array.' });
    }

    const stats = await Stats.findOneAndUpdate(
      { userId },
      {
        $set: {
          selections,
          lastSelectionMadeDate: todayInEST, // Update LSMD
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ selections: stats.selections });
  } catch (error) {
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
    const { userId } = req.params;
    const { completedSelections } = req.body;

    // Validate userId and completedSelections
    if (!userId || !Array.isArray(completedSelections)) {
      console.error("Invalid parameters for saving completedSelections:", { userId, completedSelections });
      return res.status(400).json({ message: "Invalid parameters. Cannot save completedSelections." });
    }

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      console.error(`Stats not found for userId: ${userId}`);
      return res.status(404).json({ message: "Stats not found for this user." });
    }

    // Update and save completedSelections
    stats.completedSelections = completedSelections;
    const updatedStats = await stats.save();

    console.log("CompletedSelections saved successfully in backend:", updatedStats.completedSelections);

    res.status(200).json(updatedStats);
  } catch (error) {
    console.error("Error saving completedSelections:", error);
    res.status(500).json({ message: "Failed to save completedSelections." });
  }
};

exports.saveAlreadyGuessed = async (req, res) => {
  try {
    const { userId } = req.user;
    const { alreadyGuessed } = req.body;

    if (!Array.isArray(alreadyGuessed)) {
      return res.status(400).json({ message: "Invalid alreadyGuessed data." });
    }

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $set: { alreadyGuessed } },
      { new: true, upsert: true }
    );

    res.status(200).json({ alreadyGuessed: stats.alreadyGuessed });
  } catch (error) {
    console.error("Error updating alreadyGuessed:", error);
    res.status(500).json({ message: "Failed to update alreadyGuessed." });
  }
};

exports.saveAttempts = async (req, res) => {
  const { userId } = req.user;
  const { attempts } = req.body;

  if (!Array.isArray(attempts)) {
    return res.status(400).json({ message: "Invalid attempts data." });
  }

  // Ensure boolean values are stored
  const formattedAttempts = attempts.map(attempt =>
    attempt.map(selected => !!selected) // Convert values to true/false
  );

  const stats = await Stats.findOneAndUpdate(
    { userId },
    { $set: { attempts: formattedAttempts } },
    { new: true, upsert: true }
  );

  res.status(200).json({ attempts: stats.attempts });
};

exports.saveCompletedAttempts = async (req, res) => {
  try {
    const { userId } = req.user;
    const { completedAttempts } = req.body;

    if (!Array.isArray(completedAttempts)) {
      return res.status(400).json({ message: "Invalid completedAttempts data." });
    }

    // ✅ Ensure the user document exists before updating
    let stats = await Stats.findOne({ userId });

    if (!stats) {
      console.log(`⚠️ No stats found for user ${userId}, creating new document.`);
      stats = new Stats({ userId, completedAttempts: [] });
    }

    stats.completedAttempts = completedAttempts;
    await stats.save();

    res.status(200).json({ completedAttempts: stats.completedAttempts });
  } catch (error) {
    console.error("❌ Error updating completedAttempts:", error);
    res.status(500).json({ message: "Failed to update completedAttempts.", error });
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
    const todayInEST = getTodayInEST();

    const stats = await Stats.findOneAndUpdate(
      { userId },
      { $inc: { triesRemaining: -1 }, lastTriesMadeDate: todayInEST }, // Update LTMD on attempt
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
    const todayInEST = getTodayInEST();

    console.log(`Checking if tries should be reset for user ${userId}...`);

    const stats = await Stats.findOne({ userId });

    if (!stats) {
      console.error(`Stats not found for user ${userId}`);
      return res.status(404).json({ message: 'Stats not found for user.' });
    }

    // Reset tries if the game was completed today or if the user last attempted yesterday
    if (stats.lastPlayedDate === todayInEST || stats.lastTriesMadeDate !== todayInEST) {
      console.log(`Resetting triesRemaining to 3 for user ${userId}`);
      stats.triesRemaining = 3;
      stats.lastTriesMadeDate = todayInEST;
      await stats.save();
    } else {
      console.log(`Tries remain unchanged for user ${userId}, current tries: ${stats.triesRemaining}`);
    }

    res.status(200).json({ triesRemaining: stats.triesRemaining });
  } catch (error) {
    console.error('Error resetting triesRemaining:', error);
    res.status(500).json({ message: 'Failed to reset triesRemaining.' });
  }
};
