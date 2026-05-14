const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  JWT_SECRET,
  checkAuth,
  getUser,
  createUser,
  getAllUsers,
  updateUserRole,
} = require('../config');
const { checkRole, ROLES } = require('../middleware/accessControlList');

const router = express.Router();

router.get('/register', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  res.render('register', { error: null });
});

router.get('/login', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  res.render('login', { error: null });
});

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

    await createUser(email, password, name, ROLES.ANGGOTA);
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Terjadi kesalahan pada server saat mendaftar.' });
  }
});

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
      { id: user.id, email: user.email, role: user.role || ROLES.ANGGOTA },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Terjadi kesalahan pada server saat login.' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

router.get('/dashboard', checkAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.email);
    res.render('dashboard', { user });
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memuat dashboard.' });
  }
});

router.get('/pagenotfound', checkAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.email);
    res.render('pagenotfound', { user });
  } catch (err) {
    res.status(500).render('error', { message: 'Page rusak atau belum ada.' });
  }
});

router.get('/users', checkAuth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.render('admin/users', { user: req.user, users });
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memuat daftar pengguna.' });
  }
});

router.post('/users/role', checkAuth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).render('error', { message: 'userId dan role harus diisi.' });
    }

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).render('error', {
        message: `Role tidak valid. Pilih salah satu: ${validRoles.join(', ')}.`,
      });
    }

    await updateUserRole(userId, role);
    res.redirect('/auth/users');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Gagal memperbarui peran pengguna.' });
  }
});

module.exports = router;