const express = require('express');
const router = express.Router();

// Route to handle user login (for now, return a mock response)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Dummy logic for login
  if (username === 'admin' && password === 'password') {
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

module.exports = router;
