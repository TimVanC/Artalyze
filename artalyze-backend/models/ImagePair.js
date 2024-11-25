// models/ImagePair.js

const mongoose = require('mongoose');

const ImagePairSchema = new mongoose.Schema({
  scheduledDate: { 
    type: Date, 
    required: true,
    unique: true 
  },
  pairs: [
    {
      humanImageURL: { type: String, required: true },
      aiImageURL: { type: String, required: true }
    }
  ],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'live'], 
    default: 'pending' 
  }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImagePair', ImagePairSchema);
