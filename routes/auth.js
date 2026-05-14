const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET, checkAuth, getUser, createUser, getAllUsers } = require('../config');

const router = express.Router();

// ===== RENDER FORMS =====
router.get('/register', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  res.render('register', { error: null });
});

router.get('/login', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  res.render('login', { error: null });
});

// ===== REGISTER =====
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.render('register', { error: 'Email, password, dan name harus diisi' });
    }

    const existingUser = await getUser(email);
    if (existingUser) {
      return res.render('register', { error: 'Email sudah terdaftar' });
    }

    await createUser(email, password, name);
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Terjadi kesalahan pada server saat mendaftar.' });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', { error: 'Email dan password harus diisi' });
    }

    const user = await getUser(email);
    if (!user) {
      return res.render('login', { error: 'Email atau password salah' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('login', { error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Terjadi kesalahan pada server saat login.' });
  }
});

// ===== LOGOUT =====
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// ===== GET DASHBOARD (Protected) =====
router.get('/dashboard', checkAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.email);
    res.render('dashboard', { user });
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memuat dashboard.' });
  }
});

// ===== GET Page rusak (Protected) =====
router.get('/pagenotfound', checkAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.email);
    res.render('pagenotfound', { user });
  } catch (err) {
    res.status(500).render('error', { message: 'Page rusak atau belum ada.' });
  }
});


// ===== UPDATE USER ROLE (Admin Only) =====
router.post('/users/role', checkAuth, checkRole('admin'), async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).send('userId dan role harus diisi');
    }

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).send('Role tidak valid');
    }

    await updateUserRole(userId, role);
    res.redirect('/auth/users');
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memperbarui peran pengguna.' });
  }
});

module.exports = router;
