'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config.js').pool;
const { MODEL_TYPE, mapDbStatus, ensureRoles, ensureLecturerProfile } = require('./dbHelpers');

function normalizeUser(row) {
  if (!row) return null;
  return {
    ...row,
    role: row.role || 'dosen',
    status: mapDbStatus(row.status),
  };
}


async function getUser(email) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT u.*, 
             COALESCE(r.name, 'dosen') AS role,
             COALESCE(e.status, 'active') AS status
      FROM users u
      LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
      LEFT JOIN roles r ON r.id = mhr.role_id
      LEFT JOIN employees e ON e.id = u.id
      WHERE u.email = ?
    `, [MODEL_TYPE, email]);
    return normalizeUser(rows[0]);
  } finally {
    conn.release();
  }
}


async function getUserById(id) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT u.*, 
             COALESCE(r.name, 'dosen') AS role,
             COALESCE(e.status, 'active') AS status
      FROM users u
      LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
      LEFT JOIN roles r ON r.id = mhr.role_id
      LEFT JOIN employees e ON e.id = u.id
      WHERE u.id = ?
    `, [MODEL_TYPE, id]);
    return normalizeUser(rows[0]);
  } finally {
    conn.release();
  }
}


async function createUser(email, password, name, role = 'dosen') {
  const hashedPassword = await bcrypt.hash(password, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await ensureRoles(conn);

    const [result] = await conn.execute(
      'INSERT INTO users (email, password, name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [email, hashedPassword, name]
    );
    const userId = result.insertId;

    const [roleRows] = await conn.execute(
      'SELECT id FROM roles WHERE name = ? AND guard_name = ?',
      [role, 'web']
    );
    if (roleRows.length > 0) {
      await conn.execute(
        'INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)',
        [roleRows[0].id, MODEL_TYPE, userId]
      );
    }

    await ensureLecturerProfile(conn, userId, name);

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}


async function getAllUsers() {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT u.id, u.name, u.email, 
             COALESCE(r.name, 'dosen') AS role,
             COALESCE(e.status, 'active') AS status,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
      LEFT JOIN roles r ON r.id = mhr.role_id
      LEFT JOIN employees e ON e.id = u.id
      ORDER BY u.created_at DESC
    `, [MODEL_TYPE]);
    return rows.map(normalizeUser);
  } finally {
    conn.release();
  }
}


async function searchUsers(keyword) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT u.id, u.name, u.email, 
             COALESCE(r.name, 'dosen') AS role,
             COALESCE(e.status, 'active') AS status,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
      LEFT JOIN roles r ON r.id = mhr.role_id
      LEFT JOIN employees e ON e.id = u.id
      WHERE u.name LIKE ? OR u.email LIKE ?
      ORDER BY u.created_at DESC
    `, [MODEL_TYPE, `%${keyword}%`, `%${keyword}%`]);
    return rows.map(normalizeUser);
  } finally {
    conn.release();
  }
}


async function updateUserRole(userId, role) {
  const validRoles = ['admin', 'dosen'];
  if (!validRoles.includes(role)) throw new Error('Role tidak valid');

  const conn = await db.getConnection();
  try {
    await ensureRoles(conn);
    await conn.execute(
      'DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?',
      [userId, MODEL_TYPE]
    );
    const [roleRows] = await conn.execute(
      'SELECT id FROM roles WHERE name = ? AND guard_name = ?',
      [role, 'web']
    );
    if (roleRows.length > 0) {
      await conn.execute(
        'INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)',
        [roleRows[0].id, MODEL_TYPE, userId]
      );
    }
    return true;
  } finally {
    conn.release();
  }
}


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

    await conn.execute(
      'UPDATE employees SET name = ?, updated_at = NOW() WHERE id = ?',
      [name, userId]
    );

    return true;
  } finally {
    conn.release();
  }
}


async function updateUserStatus(id, status) {
  const validStatus = ['aktif', 'nonaktif'];
  if (!validStatus.includes(status)) throw new Error('Status tidak valid');

  const dbStatus = status === 'aktif' ? 'active' : 'inactive';

  const conn = await db.getConnection();
  try {
    const userName = (await conn.execute('SELECT name FROM users WHERE id = ?', [id]))[0][0]?.name || 'Unknown';
    await ensureLecturerProfile(conn, id, userName);

    const [result] = await conn.execute(
      'UPDATE employees SET status = ?, updated_at = NOW() WHERE id = ?',
      [dbStatus, id]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}


async function deleteUser(id) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    
    await conn.execute('DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?', [id, MODEL_TYPE]);
    
    
    await conn.execute('DELETE FROM research_members WHERE lecturer_id = ?', [id]);

    
    await conn.execute('DELETE FROM lecturers WHERE id = ?', [id]);
    await conn.execute('DELETE FROM employees WHERE id = ?', [id]);

    
    const [result] = await conn.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    await conn.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await conn.rollback();
    throw error;
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
