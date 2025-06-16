// models/ImagePair.js

const mongoose = require('mongoose');

const ImagePairSchema = new mongoose.Schema({
  scheduledDate: { 
    type: Date, 
    required: true,
    unique: true,
    validate: {
      validator: function(value) {
        const today = new Date();
        today.setUTCHours(5, 0, 0, 0); // Set to midnight EST (5 AM UTC)
        return value >= today;
      },
      message: 'Cannot schedule image pairs for dates before the current day'
    }
  },
  pairs: [
    {
      humanImageURL: { type: String, required: true },
      aiImageURL: { type: String, required: true },
      metadata: { type: Object, default: {} } // Added for future extensibility
    }
  ],
  pendingHumanImages: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
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

const collectionName = process.env.NODE_ENV === "staging" ? "staging_imagePairs" : "imagePairs";

module.exports = mongoose.model(collectionName, ImagePairSchema);

