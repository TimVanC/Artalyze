const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    winPercentage: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    maxStreak: {
      type: Number,
      default: 0,
    },
    perfectPuzzles: {
      type: Number,
      default: 0,
    },
    mistakeDistribution: {
      type: Map,
      of: Number,
      default: {
        '0': 0,
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      },
    },
    mostRecentScore: {
      type: Number, // Tracks the last mistake count
      default: null,
    },
    lastPlayedDate: {
      type: String, // Storing as a string in YYYY-MM-DD format for simplicity
      default: null,
    },
    triesRemaining: {
      type: Number, // Tracks the remaining tries for the current day
      default: 3,
    },
    selections: {
      type: Array, // Stores user selections for the current game
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stats', statsSchema);
