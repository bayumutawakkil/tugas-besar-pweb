'use strict';

const db = require('../config/database');

// ── Ambil semua penelitian ───────────────────────────────────────────────────
async function getAllPenelitian() {
  const [rows] = await db.query(`
    SELECT
      p.*,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      COUNT(DISTINCT ap.id) AS total_anggota,
      COUNT(DISTINCT CASE WHEN ap.status = 'approved' THEN ap.id END) AS anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN penelitian_anggota ap ON p.id = ap.penelitian_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

// ── Ambil penelitian berdasarkan dosen (ketua atau anggota) ─────────────────
async function getPenelitianByDosenId(dosenId) {
  const [rows] = await db.query(`
    SELECT DISTINCT
      p.*,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      ap.role   AS my_role,
      ap.status AS my_status,
      COUNT(DISTINCT ap2.id) AS total_anggota,
      COUNT(DISTINCT CASE WHEN ap2.status = 'approved' THEN ap2.id END) AS anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN penelitian_anggota ap  ON p.id = ap.penelitian_id  AND ap.dosen_id  = ?
    LEFT JOIN penelitian_anggota ap2 ON p.id = ap2.penelitian_id
    WHERE p.ketua_id = ? OR ap.dosen_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [dosenId, dosenId, dosenId]);
  return rows;
}

// ── Ambil satu penelitian berdasarkan ID ────────────────────────────────────
async function getPenelitianById(penelitianId) {
  const [rows] = await db.query(`
    SELECT
      p.*,
      u.name  AS ketua_name,
      u.email AS ketua_email
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    WHERE p.id = ?
  `, [penelitianId]);
  return rows[0] || null;
}

// ── Ambil daftar anggota penelitian ─────────────────────────────────────────
async function getAnggotaPenelitian(penelitianId) {
  const [rows] = await db.query(`
    SELECT
      ap.*,
      u.name  AS dosen_name,
      u.email AS dosen_email
    FROM penelitian_anggota ap
    LEFT JOIN users u ON ap.dosen_id = u.id
    WHERE ap.penelitian_id = ?
    ORDER BY ap.role DESC, ap.status, ap.created_at
  `, [penelitianId]);
  return rows;
}

// ── Cek apakah user adalah ketua ────────────────────────────────────────────
async function isKetuaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM penelitian WHERE id = ? AND ketua_id = ?',
    [penelitianId, userId]
  );
  return rows.length > 0;
}

// ── Cek apakah user adalah anggota ──────────────────────────────────────────
async function isAnggotaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM penelitian_anggota WHERE penelitian_id = ? AND dosen_id = ?',
    [penelitianId, userId]
  );
  return rows.length > 0;
}

// ── Ambil role user dalam penelitian ────────────────────────────────────────
async function getUserRoleInPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT role, status FROM penelitian_anggota WHERE penelitian_id = ? AND dosen_id = ?',
    [penelitianId, userId]
  );
  return rows[0] || null;
}

// ── Buat penelitian baru ─────────────────────────────────────────────────────
async function createPenelitian(data) {
  const { judul, deskripsi, tahun_mulai, tahun_selesai, status, ketua_id } = data;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO penelitian (judul, deskripsi, tahun_mulai, tahun_selesai, status, ketua_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [judul, deskripsi, tahun_mulai, tahun_selesai, status || 'draft', ketua_id]
    );

    const penelitianId = result.insertId;

    // Otomatis tambah ketua sebagai anggota dengan status approved
    await conn.query(
      `INSERT INTO penelitian_anggota (penelitian_id, dosen_id, role, status)
       VALUES (?, ?, 'Ketua', 'approved')`,
      [penelitianId, ketua_id]
    );

    await conn.commit();
    return penelitianId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── Update data penelitian ───────────────────────────────────────────────────
async function updatePenelitian(penelitianId, data) {
  const { judul, deskripsi, tahun_mulai, tahun_selesai, status } = data;

  const [result] = await db.query(
    `UPDATE penelitian
     SET judul = ?, deskripsi = ?, tahun_mulai = ?, tahun_selesai = ?, status = ?
     WHERE id = ?`,
    [judul, deskripsi, tahun_mulai, tahun_selesai, status, penelitianId]
  );
  return result.affectedRows > 0;
}

// ── Hapus penelitian ─────────────────────────────────────────────────────────
async function deletePenelitian(penelitianId) {
  const [result] = await db.query(
    'DELETE FROM penelitian WHERE id = ?',
    [penelitianId]
  );
  return result.affectedRows > 0;
}

// ── Tambah anggota ke penelitian ─────────────────────────────────────────────
async function addAnggotaPenelitian(penelitianId, dosenId) {
  try {
    const [result] = await db.query(
      `INSERT INTO penelitian_anggota (penelitian_id, dosen_id, role, status)
       VALUES (?, ?, 'Anggota', 'pending')`,
      [penelitianId, dosenId]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('Dosen sudah terdaftar sebagai anggota penelitian ini.');
    }
    throw err;
  }
}

// ── Update status keanggotaan (approve / reject) ─────────────────────────────
async function updateStatusAnggota(penelitianId, dosenId, status) {
  const [result] = await db.query(
    `UPDATE penelitian_anggota SET status = ?
     WHERE penelitian_id = ? AND dosen_id = ?`,
    [status, penelitianId, dosenId]
  );
  return result.affectedRows > 0;
}

// ── Hapus anggota dari penelitian ────────────────────────────────────────────
async function removeAnggotaPenelitian(penelitianId, dosenId) {
  const [result] = await db.query(
    `DELETE FROM penelitian_anggota
     WHERE penelitian_id = ? AND dosen_id = ? AND role = 'Anggota'`,
    [penelitianId, dosenId]
  );
  return result.affectedRows > 0;
}

// ── Cari penelitian berdasarkan keyword ─────────────────────────────────────
async function searchPenelitian(keyword, dosenId = null) {
  let query = `
    SELECT DISTINCT
      p.*,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      COUNT(DISTINCT ap.id) AS total_anggota,
      COUNT(DISTINCT CASE WHEN ap.status = 'approved' THEN ap.id END) AS anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN penelitian_anggota ap ON p.id = ap.penelitian_id
    WHERE (p.judul LIKE ? OR p.deskripsi LIKE ? OR u.name LIKE ?)
  `;

  const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

  if (dosenId) {
    query += ' AND (p.ketua_id = ? OR ap.dosen_id = ?)';
    params.push(dosenId, dosenId);
  }

  query += ' GROUP BY p.id ORDER BY p.created_at DESC';

  const [rows] = await db.query(query, params);
  return rows;
}

// ── Ambil semua dosen (untuk dropdown tambah anggota) ───────────────────────
async function getAllDosen() {
  const [rows] = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'dosen' ORDER BY name"
  );
  return rows;
}

// ── Ambil dosen yang belum terdaftar di penelitian tertentu ─────────────────
async function getAvailableDosen(penelitianId) {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     WHERE u.role = 'dosen' AND u.id NOT IN (
       SELECT dosen_id FROM penelitian_anggota WHERE penelitian_id = ?
     )
     ORDER BY u.name`,
    [penelitianId]
  );
  return rows;
}

module.exports = {
  getAllPenelitian,
  getPenelitianByDosenId,
  getPenelitianById,
  getAnggotaPenelitian,
  isKetuaPenelitian,
  isAnggotaPenelitian,
  getUserRoleInPenelitian,
  createPenelitian,
  updatePenelitian,
  deletePenelitian,
  addAnggotaPenelitian,
  updateStatusAnggota,
  removeAnggotaPenelitian,
  searchPenelitian,
  getAllDosen,
  getAvailableDosen,
};
