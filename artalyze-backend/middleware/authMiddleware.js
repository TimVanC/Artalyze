// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Decoded Token:', decoded); // For debugging purposes
    }

    // Fetch the user from the database to verify and add user details
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = {
      userId: decoded.userId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }; // Attach user details to the request object
    next();
  } catch (error) {
    console.log('Invalid or expired token', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to check if the user is an admin
exports.authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // User is admin, continue
  } else if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  } else {
    res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};
