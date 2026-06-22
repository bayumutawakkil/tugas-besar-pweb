require('dotenv').config();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'facultyware',
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

const createUser = async (email, password, name, role = 'dosen') => {
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
    const [rows] = await conn.execute(
      'SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  } finally {
    conn.release();
  }
};

const updateUserRole = async (userId, role) => {
  const validRoles = ['admin', 'dosen'];
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

const updateUserProfile = async (userId, { name, email, password }) => {
  const conn = await pool.getConnection();
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, updated_at = NOW() WHERE id = ?',
        [name, email, hashedPassword, userId]
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
};

const updateUserStatus = async (id, status) => {
  const validStatus = ['aktif', 'nonaktif'];
  if (!validStatus.includes(status)) throw new Error('Status tidak valid');

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result;
  } finally {
    conn.release();
  }
};

const getUserById = async (id) => {
  const conn = await pool.getConnection();

  try {

    const [rows] = await conn.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    return rows[0] || null;

  } finally {
    conn.release();
  }
};

const deleteUser = async (id) => {

  const conn = await pool.getConnection();

  try {

    const [result] = await conn.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    return result;

  } finally {
    conn.release();
  }
};

const searchUsers = async (keyword) => {
  const conn = await pool.getConnection();
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
};



module.exports = {
  pool,
  JWT_SECRET,
  checkAuth,
  getUser,
  getUserById,
  createUser,
  getAllUsers,
  updateUserRole,
  updateUserProfile,
  deleteUser,
  searchUsers,
  updateUserStatus
};