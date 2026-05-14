require('dotenv').config();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pweb_ftirda',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_this';

const checkAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};

const getUser = async (email) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
};

const createUser = async (email, password, name, role = 'anggota') => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      'INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [email, hashedPassword, name, role]
    );
    return true;
  } finally {
    conn.release();
  }
};

const getAllUsers = async () => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute('SELECT id, email, name, role FROM users');
    return rows;
  } finally {
    conn.release();
  }
};

const updateUserRole = async (userId, role) => {
  const validRoles = ['admin', 'dosen', 'anggota'];
  if (!validRoles.includes(role)) throw new Error('Role tidak valid');

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, userId]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
};

module.exports = {
  pool,
  JWT_SECRET,
  checkAuth,
  getUser,
  createUser,
  getAllUsers,
  updateUserRole,
};