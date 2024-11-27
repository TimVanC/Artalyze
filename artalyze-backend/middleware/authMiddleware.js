//authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded); // Verify decoded token
    req.user = decoded; // Attach decoded token (containing userId) to the request object
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
