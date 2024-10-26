const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes'); // Authentication routes
const gameRoutes = require('./routes/gameRoutes'); // Game-related routes
const imageRoutes = require('./routes/imageRoutes'); // Image upload routes
const connectDB = require('./config/db'); // Database connection function
require('dotenv').config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for cross-origin requests
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to the database
connectDB();

// Serve static files from the "uploads" folder
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/game', gameRoutes); // Game-related routes
app.use('/api/images', imageRoutes); // Image upload routes

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'An error occurred. Please try again later.' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../artalyze-user/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../artalyze-user', 'build', 'index.html'));
    });
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
