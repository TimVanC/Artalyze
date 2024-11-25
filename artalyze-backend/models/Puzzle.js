const mongoose = require('mongoose');

const PuzzleSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Example: '2024-11-12'
  imagePairs: [
    {
      human: String,
      ai: String,
    },
  ],
});

module.exports = mongoose.model('Puzzle', PuzzleSchema);
