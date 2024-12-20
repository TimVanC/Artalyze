const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
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
  lastPlayedDate: { 
    type: String, // Storing as a string in YYYY-MM-DD format for simplicity
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Stats', statsSchema);
