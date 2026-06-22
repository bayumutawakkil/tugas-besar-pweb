const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  JWT_SECRET,
  checkAuth,
  getUser,
  getUserById,
  createUser,
  updateUserProfile,
} = require('../config');
const { ROLES } = require('../middleware/accessControlList');

const router = express.Router();

router.get('/register', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  res.render('register', { error: null, success: null });
});

router.get('/login', (req, res) => {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  const success = req.query.registered === '1' ? 'Registrasi berhasil! Silakan login dengan akun Anda.' : null;
  res.render('login', { error: null, success });
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
    res.redirect('/auth/login?registered=1');
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
    res.cookie('toast_success', 'Login berhasil! Selamat datang kembali.', {
      httpOnly: false,
      maxAge: 5000,
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

router.get('/users', checkAuth, async (req, res) => {
  const user = await getUser(req.user.email);
  res.render('pagenotfound', { user });
});

router.get('/profile', checkAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.render('profile', { user, error: null, success: null });
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memuat halaman profil.' });
  }
});

router.post('/profile', checkAuth, async (req, res) => {
  try {
    const { name, email, password, password_confirm } = req.body;
    const user = await getUserById(req.user.id);

    if (!name || !email) {
      return res.render('profile', { user, error: 'Nama dan email harus diisi.', success: null });
    }

    if (email !== user.email) {
      const existing = await getUser(email);
      if (existing && existing.id !== user.id) {
        return res.render('profile', { user, error: 'Email sudah digunakan akun lain.', success: null });
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.render('profile', { user, error: 'Password minimal 6 karakter.', success: null });
      }
      if (password !== password_confirm) {
        return res.render('profile', { user, error: 'Konfirmasi password tidak cocok.', success: null });
      }
    }

    await updateUserProfile(user.id, { name, email, password: password || null });

    const newToken = jwt.sign(
      { id: user.id, email, role: user.role || ROLES.ANGGOTA },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const updatedUser = await getUserById(user.id);
    res.render('profile', { user: updatedUser, error: null, success: 'Profil berhasil diperbarui!' });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;