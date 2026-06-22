'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ── Baca satu user berdasarkan email ────────────────────────────────────────
async function getUser(email) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

// ── Baca satu user berdasarkan ID ───────────────────────────────────────────
async function getUserById(id) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

// ── Buat user baru ───────────────────────────────────────────────────────────
async function createUser(email, password, name, role = 'dosen') {
  const hashedPassword = await bcrypt.hash(password, 10);
  const conn = await db.getConnection();
  try {
    await conn.execute(
      'INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [email, hashedPassword, name, role]
    );
    return true;
  } finally {
    conn.release();
  }
}

// ── Ambil semua user ─────────────────────────────────────────────────────────
async function getAllUsers() {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  } finally {
    conn.release();
  }
}

// ── Cari user berdasarkan nama atau email ────────────────────────────────────
async function searchUsers(keyword) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
       WHERE name LIKE ? OR email LIKE ?
       ORDER BY created_at DESC`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  } finally {
    conn.release();
  }
}

// ── Update role user ─────────────────────────────────────────────────────────
async function updateUserRole(userId, role) {
  const validRoles = ['admin', 'dosen'];
  if (!validRoles.includes(role)) throw new Error('Role tidak valid');

  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, userId]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

// ── Update profil user (nama, email, password opsional) ──────────────────────
async function updateUserProfile(userId, { name, email, password }) {
  const conn = await db.getConnection();
  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await conn.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, updated_at = NOW() WHERE id = ?',
        [name, email, hashed, userId]
      );
    } else {
      await conn.execute(
        'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
        [name, email, userId]
      );
    }
    return true;
  } finally {
    conn.release();
  }
}

// ── Update status akun (aktif / nonaktif) ────────────────────────────────────
async function updateUserStatus(id, status) {
  const validStatus = ['aktif', 'nonaktif'];
  if (!validStatus.includes(status)) throw new Error('Status tidak valid');

  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

// ── Hapus user ───────────────────────────────────────────────────────────────
async function deleteUser(id) {
  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

module.exports = {
  getUser,
  getUserById,
  createUser,
  getAllUsers,
  searchUsers,
  updateUserRole,
  updateUserProfile,
  updateUserStatus,
  deleteUser,
};
