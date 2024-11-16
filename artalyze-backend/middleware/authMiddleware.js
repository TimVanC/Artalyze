// In authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Bearer token

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Invalid or expired token', error);
        res.status(403).json({ message: 'Invalid or expired token.' });
    }
};


exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next(); // User is admin, continue
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }          
};
