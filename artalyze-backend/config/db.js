// db.js
const mongoose = require('mongoose');
require('dotenv').config();

const username = process.env.MONGO_USER;
const password = process.env.MONGO_PASS;
const dbName = process.env.NODE_ENV === "staging" ? "artalyze_staging" : process.env.MONGO_DB_NAME || "artalyze";
const uri = `mongodb+srv://${username}:${password}@cluster0.rr4c6.mongodb.net/${dbName}?retryWrites=true&w=majority`;

console.log('Database connection details:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGO_DB_NAME env var:', process.env.MONGO_DB_NAME);
console.log('- Selected dbName:', dbName);
console.log('- Full URI (without password):', uri.replace(password, '***'));

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
