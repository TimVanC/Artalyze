require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes'); // Authentication routes
const gameRoutes = require('./routes/gameRoutes'); // Game-related routes
const imageRoutes = require('./routes/imageRoutes'); // Image upload routes
const adminRoutes = require('./routes/adminRoutes'); // Admin-related routes for image pairs
const connectDB = require('./config/db'); // Database connection function

const app = express();

// Middleware
app.use((req, res, next) => {
    console.log('Request origin:', req.headers.origin);
    next();
});

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow access from frontend ports (React app)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to the database
connectDB();

// Serve static files from the "uploads" folder
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes); // Authentication routes

console.log('Mounting gameRoutes at /api/game');

app.use('/api/game', gameRoutes); // Game-related routes
app.use('/api/images', imageRoutes); // Image upload routes
app.use('/api/admin', adminRoutes); // Admin routes for managing image pairs

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'An error occurred. Please try again later.' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
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
