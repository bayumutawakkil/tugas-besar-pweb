'use strict';

require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const indexRoutes      = require('./routes/index');
const authRoutes       = require('./routes/auth');
const penelitianRoutes = require('./routes/penelitian');
const apiRoutes        = require('./routes/api');
const { attachViewLocals } = require('./middleware/viewLocals');

const app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachViewLocals);


app.use('/',          indexRoutes);
app.use('/auth',      authRoutes);
app.use('/penelitian', penelitianRoutes);
app.use('/api',        apiRoutes);


app.use((req, res) => {
  res.status(404).render('error', { message: '404 — Halaman tidak ditemukan.' });
});

module.exports = app;
