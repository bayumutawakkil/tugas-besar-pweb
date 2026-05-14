const express = require('express');
const router = express.Router();

// ===== HOME / LANDING PAGE =====
router.get('/', (req, res) => {
  res.render('index', { isLoggedIn: !!req.cookies.token });
});

// ===== DASHBOARD =====
router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// ===== HEALTH CHECK =====
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;
