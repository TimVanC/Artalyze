require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes'); // Authentication routes
const gameRoutes = require('./routes/gameRoutes'); // Game-related routes
const imageRoutes = require('./routes/imageRoutes'); // Image upload routes
const adminRoutes = require('./routes/adminRoutes'); // Admin-related routes for image pairs
const statsRoutes = require('./routes/statsRoutes'); // Stats-related routes
const userRoutes = require('./routes/userRoutes');
const connectDB = require('./config/db'); // Database connection function

const app = express(); // ✅ Express app is initialized before routes

// ✅ Health check route (Placed correctly)
app.get("/", (req, res) => {
    res.json({ message: "Backend is running successfully!" });
});

// Middleware for request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.originalUrl} from ${req.headers.origin}`);
    next();
});

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://artalyze.app', 'https://www.artalyze.app', 'https://artalyze-admin.vercel.app', 'https://artalyze-user.vercel.app']
        : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to the database
(async () => {
    try {
        await connectDB();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1); // Exit the process if DB connection fails
    }
})();

// Serve static files from the "uploads" folder
app.use('/uploads', express.static('uploads'));

// Mounting Routes
console.log('Mounting authRoutes at /api/auth');
app.use('/api/auth', authRoutes);

console.log('Mounting gameRoutes at /api/game');
app.use('/api/game', gameRoutes);

console.log('Mounting imageRoutes at /api/images');
app.use('/api/images', imageRoutes);

console.log('Mounting adminRoutes at /api/admin');
app.use('/api/admin', adminRoutes);

console.log('Mounting statsRoutes at /api/stats');
app.use('/api/stats', statsRoutes);

console.log('Mounting userRoutes at /api/user'); // Fixed logging
app.use('/api/user', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('An error occurred:', err.stack);
    res.status(500).send({ message: 'An error occurred. Please try again later.' });
});

// Ensure API routes are processed before serving frontend
if (process.env.NODE_ENV === 'production') {
    app.use('/api/admin', adminRoutes); // ✅ Admin API routes before serving frontend
    app.use(express.static(path.join(__dirname, '../artalyze-user/build')));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            res.status(404).json({ error: 'API route not found' }); // ✅ Prevents frontend from catching API 404 errors
        } else {
            res.sendFile(path.resolve(__dirname, '../artalyze-user', 'build', 'index.html'));
        }
    });
}

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server.');
    server.close(() => {
        console.log('HTTP server closed.');
        // Close your DB connection here if necessary
    });
});

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Remove `.html` from URLs
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    
    // Check if the file exists and serve it
    res.sendFile(filePath, (err) => {
        if (err) {
            next(); // If file doesn't exist, continue to other routes
        }
    });
});
