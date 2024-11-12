// models/ImagePair.js

const mongoose = require('mongoose');

const imagePairSchema = new mongoose.Schema({
  humanImageURL: { type: String, required: true }, // URL for the human-created image
  aiImageURL: { type: String, required: true }, // URL for the AI-generated image
  scheduledDate: { type: Date, required: true }, // Date the image pair will be shown in the game
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'live'], 
    default: 'pending' 
  }, // Track if images are ready or live for the game
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImagePair', imagePairSchema);
