const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, getUser } = require('./config');
const router = express.Router();

// ===== HOME / LANDING PAGE =====
router.get('/', async (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect('/auth/dashboard');
    } catch (err) {
      res.clearCookie('token');
    }
  }
  res.render('index', { isLoggedIn: false });
});

// ===== HEALTH CHECK =====
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;
