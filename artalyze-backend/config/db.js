// db.js
const mongoose = require('mongoose');
require('dotenv').config();

const username = process.env.MONGO_USER;
const password = process.env.MONGO_PASS;
const dbName = process.env.NODE_ENV === "staging" ? "artalyze_staging" : "artalyze";
const uri = `mongodb+srv://${username}:${password}@cluster0.rr4c6.mongodb.net/${dbName}?retryWrites=true&w=majority`;

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB database:', dbName);
        await mongoose.connect(uri);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
