require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./route');
const authRoutes = require('./routes/auth'); // RESTORED - Fitur dikembalikan
const penelitianRoutes = require('./routes/penelitian');

const app = express();

// ===== SETUP VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES =====
app.use('/', routes);
app.use('/auth', authRoutes); // RESTORED - Fitur dikembalikan
app.use('/penelitian', penelitianRoutes);

// ===== ERROR HANDLER =====
app.use((req, res) => {
  res.status(404).send('<h1>404 - Halaman tidak ditemukan</h1><a href=\"/\">Kembali ke Beranda</a>');
});

module.exports = app;
