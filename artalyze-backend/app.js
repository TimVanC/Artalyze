require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes'); // User authentication and authorization routes
const gameRoutes = require('./routes/gameRoutes'); // Game logic and puzzle management routes
const imageRoutes = require('./routes/imageRoutes'); // Image upload and management routes
const adminRoutes = require('./routes/adminRoutes'); // Administrative functions for managing image pairs
const statsRoutes = require('./routes/statsRoutes'); // User statistics and game history routes
const userRoutes = require('./routes/userRoutes'); // User profile and preferences routes
const connectDB = require('./config/db'); // Database connection configuration

const app = express();

// Log all incoming requests for debugging and monitoring
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.originalUrl} from ${req.headers.origin}`);
    next();
});

// CORS configuration
const otherOrigins = process.env.OTHER_ORIGINS ? process.env.OTHER_ORIGINS.split(",") : [];

app.use(cors({
    origin: process.env.NODE_ENV === 'staging'
        ? [
            'https://staging-admin.artalyze.app',
            'https://staging.artalyze.app',
            'https://artalyze-backend-staging.up.railway.app'
          ]
        : [
            'https://artalyze-admin.vercel.app',
            'https://artalyze.vercel.app',
            'https://artalyze-backend.up.railway.app',
            ...otherOrigins
          ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Establish database connection
(async () => {
    try {
        await connectDB();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
})();

// Verify server status
app.get("/", (req, res) => {
    res.json({ message: "Backend is running successfully!" });
});

// Mount all API routes first
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/user', userRoutes);

// API 404 handler - only handle /api/* routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler for uncaught exceptions
app.use((err, req, res, next) => {
    console.error('An error occurred:', err.stack);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
});

// Production environment configuration
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../artalyze-user/build')));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            res.status(404).json({ error: 'API route not found' });
        } else {
            res.sendFile(path.resolve(__dirname, '../artalyze-user', 'build', 'index.html'));
        }
    });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML files without the .html extension
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            next();
        }
    });
});

// Start the server on the specified port
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown on SIGTERM signal
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server.');
    server.close(() => {
        console.log('HTTP server closed.');
    });
});
