require('dotenv').config(); // Load environment variables from .env
const mongoose = require('mongoose');

// Load credentials from .env
const mongoURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.mongodb.net/${process.env.MONGO_URI}?retryWrites=true&w=majority`;

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const Stats = require('../models/Stats'); // Adjust the path to your Stats model if necessary

const updateStats = async () => {
    try {
        // Update all documents in the stats collection
        await Stats.updateMany({}, { $set: { lastPlayedDate: null } });
        console.log('Documents updated successfully!');
    } catch (error) {
        console.error('Error updating documents:', error);
    } finally {
        mongoose.disconnect();
    }
};

updateStats();
