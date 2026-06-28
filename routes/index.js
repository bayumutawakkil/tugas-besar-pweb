'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const router  = express.Router();


router.get('/', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect('/auth/dashboard');
    } catch {
      res.clearCookie('token');
    }
  }
  return res.render('index', { isLoggedIn: false });
});


router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;
