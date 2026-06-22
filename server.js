'use strict';

require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const indexRoutes      = require('./routes/index');
const authRoutes       = require('./routes/auth');
const penelitianRoutes = require('./routes/penelitian');

const app = express();

// ── View Engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/',          indexRoutes);
app.use('/auth',      authRoutes);
app.use('/penelitian', penelitianRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { message: '404 — Halaman tidak ditemukan.' });
});

module.exports = app;
