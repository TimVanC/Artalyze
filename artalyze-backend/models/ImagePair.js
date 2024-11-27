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
      aiImageURL: { type: String, required: true },
      metadata: { type: Object, default: {} } // Added for future extensibility
    }
  ],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'live'], 
    default: 'pending' 
  }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // Added updated timestamp for tracking updates
});

ImagePairSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
}); // Middleware to update 'updatedAt' before saving

module.exports = mongoose.model('ImagePair', ImagePairSchema);
