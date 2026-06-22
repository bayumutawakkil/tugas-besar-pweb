'use strict';

const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');
const { ROLES }      = require('../middleware/acl');
const userModel      = require('../models/userModel');

// ── Register ─────────────────────────────────────────────────────────────────
async function showRegister(req, res) {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  return res.render('auth/register', { error: null, success: null });
}

async function handleRegister(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.render('auth/register', { error: 'Email, password, dan nama harus diisi.', success: null });
    }

    const existing = await userModel.getUser(email);
    if (existing) {
      return res.render('auth/register', { error: 'Email sudah terdaftar.', success: null });
    }

    await userModel.createUser(email, password, name, ROLES.DOSEN);
    return res.redirect('/auth/login?registered=1');
  } catch (err) {
    console.error('[Auth] handleRegister error:', err);
    return res.status(500).render('error', { message: 'Terjadi kesalahan saat mendaftar.' });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function showLogin(req, res) {
  if (req.cookies.token) return res.redirect('/auth/dashboard');
  const success = req.query.registered === '1'
    ? 'Registrasi berhasil! Silakan login.'
    : null;
  return res.render('auth/login', { error: null, success });
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', { error: 'Email dan password harus diisi.', success: null });
    }

    const user = await userModel.getUser(email);
    if (!user) {
      return res.render('auth/login', { error: 'Email atau password salah.', success: null });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.render('auth/login', { error: 'Email atau password salah.', success: null });
    }

    if (user.status === 'nonaktif') {
      return res.render('auth/login', { error: 'Akun Anda dinonaktifkan oleh administrator.', success: null });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || ROLES.DOSEN },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.cookie('toast_success', 'Login berhasil! Selamat datang kembali.', {
      httpOnly: false,
      maxAge:   5000,
      sameSite: 'lax',
    });

    return res.redirect('/auth/dashboard');
  } catch (err) {
    console.error('[Auth] handleLogin error:', err);
    return res.status(500).render('error', { message: 'Terjadi kesalahan saat login.' });
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout(req, res) {
  res.clearCookie('token');
  return res.redirect('/');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function showDashboard(req, res) {
  try {
    const user = await userModel.getUser(req.user.email);
    return res.render('auth/dashboard', { user });
  } catch (err) {
    console.error('[Auth] showDashboard error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat dashboard.' });
  }
}

// ── Page Not Found ────────────────────────────────────────────────────────────
async function showPageNotFound(req, res) {
  try {
    const user = await userModel.getUser(req.user.email);
    return res.render('pagenotfound', { user });
  } catch {
    return res.status(404).render('pagenotfound', { user: req.user });
  }
}

// ── Profil ────────────────────────────────────────────────────────────────────
async function showProfile(req, res) {
  try {
    const user = await userModel.getUserById(req.user.id);
    return res.render('auth/profile', { user, error: null, success: null });
  } catch (err) {
    console.error('[Auth] showProfile error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat halaman profil.' });
  }
}

async function handleProfile(req, res) {
  try {
    const { name, email, password, password_confirm } = req.body;
    const user = await userModel.getUserById(req.user.id);

    if (!name || !email) {
      return res.render('auth/profile', { user, error: 'Nama dan email harus diisi.', success: null });
    }

    if (email !== user.email) {
      const existing = await userModel.getUser(email);
      if (existing && existing.id !== user.id) {
        return res.render('auth/profile', { user, error: 'Email sudah digunakan akun lain.', success: null });
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.render('auth/profile', { user, error: 'Password minimal 6 karakter.', success: null });
      }
      if (password !== password_confirm) {
        return res.render('auth/profile', { user, error: 'Konfirmasi password tidak cocok.', success: null });
      }
    }

    await userModel.updateUserProfile(user.id, { name, email, password: password || null });

    // Refresh token jika email berubah
    const newToken = jwt.sign(
      { id: user.id, email, role: user.role || ROLES.DOSEN },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('token', newToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const updatedUser = await userModel.getUserById(user.id);
    return res.render('auth/profile', { user: updatedUser, error: null, success: 'Profil berhasil diperbarui!' });
  } catch (err) {
    console.error('[Auth] handleProfile error:', err);
    return res.status(500).render('error', { message: 'Gagal memperbarui profil.' });
  }
}

// ── Kelola User (Admin only) ──────────────────────────────────────────────────
async function showUsers(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    const users = await userModel.getAllUsers();
    return res.render('auth/users', { user: currentUser, users });
  } catch (err) {
    console.error('[Auth] showUsers error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat data pengguna.' });
  }
}

async function searchUsers(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    const keyword = req.query.keyword || '';
    const users   = await userModel.searchUsers(keyword);
    return res.render('auth/users', { user: currentUser, users, keyword });
  } catch (err) {
    console.error('[Auth] searchUsers error:', err);
    return res.status(500).render('error', { message: 'Gagal mencari pengguna.' });
  }
}

async function showUserDetail(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    const detailUser = await userModel.getUserById(req.params.id);
    if (!detailUser) return res.status(404).render('error', { message: 'Pengguna tidak ditemukan.' });

    return res.render('auth/user-detail', { user: currentUser, detailUser });
  } catch (err) {
    console.error('[Auth] showUserDetail error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat detail pengguna.' });
  }
}

async function handleEditUser(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    await userModel.updateUserProfile(req.params.id, {
      name:     req.body.name,
      email:    req.body.email,
      password: null,
    });
    return res.redirect('/auth/users');
  } catch (err) {
    console.error('[Auth] handleEditUser error:', err);
    return res.status(500).render('error', { message: 'Gagal mengubah data pengguna.' });
  }
}

async function handleUpdateRole(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    await userModel.updateUserRole(req.params.id, req.body.role);
    return res.redirect('/auth/users');
  } catch (err) {
    console.error('[Auth] handleUpdateRole error:', err);
    return res.status(500).render('error', { message: 'Gagal mengubah role pengguna.' });
  }
}

async function handleUpdateStatus(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    await userModel.updateUserStatus(req.params.id, req.body.status);
    return res.redirect('/auth/users');
  } catch (err) {
    console.error('[Auth] handleUpdateStatus error:', err);
    return res.status(500).render('error', { message: 'Gagal mengubah status pengguna.' });
  }
}

async function handleDeleteUser(req, res) {
  try {
    const currentUser = await userModel.getUser(req.user.email);
    if (currentUser.role !== ROLES.ADMIN) return res.redirect('/auth/pagenotfound');

    await userModel.deleteUser(req.params.id);
    return res.redirect('/auth/users');
  } catch (err) {
    console.error('[Auth] handleDeleteUser error:', err);
    return res.status(500).render('error', { message: 'Gagal menghapus pengguna.' });
  }
}

module.exports = {
  showRegister,
  handleRegister,
  showLogin,
  handleLogin,
  handleLogout,
  showDashboard,
  showPageNotFound,
  showProfile,
  handleProfile,
  showUsers,
  searchUsers,
  showUserDetail,
  handleEditUser,
  handleUpdateRole,
  handleUpdateStatus,
  handleDeleteUser,
};
