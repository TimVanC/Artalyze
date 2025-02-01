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
    perfectStreak: {
      type: Number,
      default: 0,
    },
    maxPerfectStreak: {
      type: Number,
      default: 0,
    },
    perfectPuzzles: {
      type: Number,
      default: 0,
    },
    mistakeDistribution: {
      type: Object,
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
      type: Number,
      default: null,
    },
    lastPlayedDate: {
      type: String,
      default: null,
    },
    lastSelectionMadeDate: {
      type: String,
      default: null, 
    },
    lastTriesMadeDate: {
      type: String,
      default: null,
    },
    triesRemaining: {
      type: Number,
      default: 3,
    },
    selections: {
      type: Array,
      default: [],
    },
    completedSelections: {
      type: Array,
      default: [],
    },
    alreadyGuessed: {
      type: [[String]],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stats', statsSchema);
