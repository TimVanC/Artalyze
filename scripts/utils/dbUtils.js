const mongoose = require('mongoose');
const ImagePair = require('../../artalyze-backend/models/ImagePair');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.rr4c6.mongodb.net/<database-name>?retryWrites=true&w=majority`;
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Update MongoDB with new image pairs
 * @param {Object} data Image pair data
 * @param {Date} data.scheduledDate Scheduled date for the puzzle
 * @param {Array} data.pairs Array of image pair objects
 * @returns {Promise<void>}
 */
async function updateMongoDB(data) {
  try {
    await connectDB();

    const { scheduledDate, pairs } = data;

    // Create new ImagePair document
    const imagePair = new ImagePair({
      scheduledDate,
      pairs,
      status: 'pending' // Default status, can be changed via admin interface
    });

    await imagePair.save();
    
    // Close the connection
    await mongoose.connection.close();

  } catch (error) {
    console.error('Error updating MongoDB:', error);
    // Ensure connection is closed even if there's an error
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    throw error;
  }
}

module.exports = {
  updateMongoDB
}; 