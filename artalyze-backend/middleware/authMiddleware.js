// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticateToken = (req, res, next) => {
  console.log('Auth middleware - Headers:', req.headers);
  console.log('Auth middleware - Authorization header:', req.header('Authorization'));
  
  const token = req.header('Authorization')?.split(' ')[1];
  console.log('Auth middleware - Extracted token:', token ? 'Token present' : 'No token');
  
  if (!token) {
    console.log('Auth middleware - No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    console.log('Auth middleware - JWT_SECRET exists:', !!process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Decoded JWT:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware - JWT verification failed:', error);
    res.status(401).json({ message: 'Unauthorized access' });
  }
};

// Middleware to check if the user is an admin
exports.authorizeAdmin = (req, res, next) => {
  console.log('Admin middleware - User object:', req.user);
  
  if (!req.user) {
    console.log('Admin middleware - No user object found');
    return res.status(401).json({ message: 'Authentication required.' });
  }
  
  console.log('Admin middleware - User role:', req.user.role);
  
  if (req.user.role === 'admin') {
    console.log('Admin middleware - Admin access granted');
    next();
  } else {
    console.error('Admin middleware - Access denied. User role:', req.user.role);
    res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};
