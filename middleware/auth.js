'use strict';

require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_this';

/**
 * Middleware: Pastikan user sudah login (JWT valid).
 * Jika tidak, redirect ke halaman login.
 */
function checkAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
}

module.exports = { JWT_SECRET, checkAuth };
