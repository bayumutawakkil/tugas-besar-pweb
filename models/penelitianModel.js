'use strict';

const db = require('../config.js').pool;
const { MODEL_TYPE, ensureLecturerProfile, resolveUserName } = require('./dbHelpers');

function mapStatusToNode(dbStatus) {
  if (dbStatus === 'proposed') return 'draft';
  if (dbStatus === 'ongoing') return 'aktif';
  if (dbStatus === 'completed') return 'selesai';
  return 'draft';
}

function mapStatusToDb(nodeStatus) {
  const statusMap = {
    draft: 'proposed',
    aktif: 'ongoing',
    selesai: 'completed',
    ditolak: 'proposed',
  };
  return statusMap[nodeStatus || 'draft'] || 'proposed';
}

function mapPenelitianRow(row) {
  if (!row) return null;
  return { ...row, status: mapStatusToNode(row.raw_status) };
}

const ROLE_KETUA = 'Ketua';
const ROLE_ANGGOTA = 'Anggota';
const ROLE_PENDING = 'Pending';

const KETUA_JOIN = `
  LEFT JOIN research_members k ON p.id = k.research_id AND k.role = '${ROLE_KETUA}'
  LEFT JOIN users u ON k.lecturer_id = u.id
`;

function mapMembershipStatus(role) {
  return role === ROLE_PENDING ? 'pending' : 'approved';
}

function mapMembershipRole(role) {
  if (role === ROLE_PENDING) return ROLE_ANGGOTA;
  return role;
}

// ── Ambil semua penelitian ───────────────────────────────────────────────────
async function getAllPenelitian() {
  const [rows] = await db.query(`
    SELECT
      p.id, p.title AS judul, p.description AS deskripsi,
      YEAR(p.start_date) AS tahun_mulai, YEAR(p.end_date) AS tahun_selesai,
      p.status AS raw_status,
      p.created_at, p.updated_at,
      k.lecturer_id AS ketua_id,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      COUNT(DISTINCT ap.id) AS total_anggota,
      COUNT(DISTINCT ap.id) AS anggota_approved
    FROM research p
    ${KETUA_JOIN}
    LEFT JOIN research_members ap ON p.id = ap.research_id
    GROUP BY p.id, k.lecturer_id, u.name, u.email
    ORDER BY p.created_at DESC
  `);
  return rows.map(mapPenelitianRow);
}

// ── Ambil penelitian berdasarkan dosen (ketua atau anggota) ─────────────────
async function getPenelitianByDosenId(dosenId) {
  const [rows] = await db.query(`
    SELECT DISTINCT
      p.id, p.title AS judul, p.description AS deskripsi,
      YEAR(p.start_date) AS tahun_mulai, YEAR(p.end_date) AS tahun_selesai,
      p.status AS raw_status,
      p.created_at, p.updated_at,
      k.lecturer_id AS ketua_id,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      CASE WHEN ap.role = '${ROLE_PENDING}' THEN '${ROLE_ANGGOTA}' ELSE ap.role END AS my_role,
      CASE WHEN ap.role = '${ROLE_PENDING}' THEN 'pending' ELSE 'approved' END AS my_status,
      COUNT(DISTINCT ap2.id) AS total_anggota,
      COUNT(DISTINCT ap2.id) AS anggota_approved
    FROM research p
    ${KETUA_JOIN}
    LEFT JOIN research_members ap  ON p.id = ap.research_id  AND ap.lecturer_id  = ?
    LEFT JOIN research_members ap2 ON p.id = ap2.research_id
    WHERE k.lecturer_id = ? OR ap.lecturer_id = ?
    GROUP BY p.id, k.lecturer_id, u.name, u.email, ap.role
    ORDER BY p.created_at DESC
  `, [dosenId, dosenId, dosenId]);
  return rows.map(mapPenelitianRow);
}

// ── Ambil undangan penelitian yang menunggu konfirmasi ─────────────────────
async function getPendingInvitations(dosenId) {
  const [rows] = await db.query(`
    SELECT
      p.id, p.title AS judul, p.description AS deskripsi,
      YEAR(p.start_date) AS tahun_mulai, YEAR(p.end_date) AS tahun_selesai,
      p.status AS raw_status,
      p.created_at, p.updated_at,
      k.lecturer_id AS ketua_id,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      ap.created_at AS invited_at
    FROM research p
    ${KETUA_JOIN}
    INNER JOIN research_members ap
      ON p.id = ap.research_id AND ap.lecturer_id = ? AND ap.role = '${ROLE_PENDING}'
    ORDER BY ap.created_at DESC
  `, [dosenId]);

  return rows.map((row) => ({
    ...mapPenelitianRow(row),
    my_role: ROLE_ANGGOTA,
    my_status: 'pending',
    invited_at: row.invited_at,
  }));
}

// ── Ambil statistik penelitian ───────────────────────────────────────────────
async function getPenelitianStats(dosenId = null) {
  const list = dosenId
    ? await getPenelitianByDosenId(dosenId)
    : await getAllPenelitian();

  const activeList = dosenId
    ? list.filter((p) => p.my_status !== 'pending')
    : list;

  return {
    total: activeList.length,
    aktif: activeList.filter((p) => p.status === 'aktif').length,
    selesai: activeList.filter((p) => p.status === 'selesai').length,
    draft: activeList.filter((p) => p.status === 'draft').length,
  };
}

// ── Ambil satu penelitian berdasarkan ID ────────────────────────────────────
async function getPenelitianById(penelitianId) {
  const [rows] = await db.query(`
    SELECT
      p.id, p.title AS judul, p.description AS deskripsi,
      YEAR(p.start_date) AS tahun_mulai, YEAR(p.end_date) AS tahun_selesai,
      p.status AS raw_status,
      p.created_at, p.updated_at,
      k.lecturer_id AS ketua_id,
      u.name  AS ketua_name,
      u.email AS ketua_email
    FROM research p
    ${KETUA_JOIN}
    WHERE p.id = ?
  `, [penelitianId]);

  return mapPenelitianRow(rows[0]);
}

// ── Ambil daftar anggota penelitian ─────────────────────────────────────────
async function getAnggotaPenelitian(penelitianId) {
  const [rows] = await db.query(`
    SELECT
      ap.id, ap.research_id AS penelitian_id, ap.lecturer_id AS dosen_id,
      ap.role,
      CASE WHEN ap.role = '${ROLE_PENDING}' THEN 'pending' ELSE 'approved' END AS status,
      ap.created_at, ap.updated_at,
      u.name  AS dosen_name,
      u.email AS dosen_email
    FROM research_members ap
    LEFT JOIN users u ON ap.lecturer_id = u.id
    WHERE ap.research_id = ?
    ORDER BY ap.role DESC, ap.created_at
  `, [penelitianId]);
  return rows.map((row) => ({
    ...row,
    role: mapMembershipRole(row.role),
    status: mapMembershipStatus(row.role),
  }));
}

// ── Cek apakah user adalah ketua ────────────────────────────────────────────
async function isKetuaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM research_members WHERE research_id = ? AND lecturer_id = ? AND role = ?',
    [penelitianId, userId, ROLE_KETUA]
  );
  return rows.length > 0;
}

// ── Cek apakah user adalah anggota ──────────────────────────────────────────
async function isAnggotaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM research_members WHERE research_id = ? AND lecturer_id = ?',
    [penelitianId, userId]
  );
  return rows.length > 0;
}

// ── Ambil role user dalam penelitian ────────────────────────────────────────
async function getUserRoleInPenelitian(penelitianId, userId) {
  const [rows] = await db.query(
    'SELECT role FROM research_members WHERE research_id = ? AND lecturer_id = ?',
    [penelitianId, userId]
  );
  if (!rows[0]) return null;
  return {
    role: mapMembershipRole(rows[0].role),
    status: mapMembershipStatus(rows[0].role),
  };
}

// ── Buat penelitian baru ─────────────────────────────────────────────────────
async function createPenelitian(data) {
  const { judul, deskripsi, tahun_mulai, tahun_selesai, status, ketua_id } = data;

  const dbStatus = mapStatusToDb(status);
  const startDate = tahun_mulai ? `${tahun_mulai}-01-01` : '1970-01-01';
  const endDate = tahun_selesai ? `${tahun_selesai}-12-31` : null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const ketuaName = await resolveUserName(conn, ketua_id);
    await ensureLecturerProfile(conn, ketua_id, ketuaName);

    const [result] = await conn.query(
      `INSERT INTO research (title, description, start_date, end_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [judul, deskripsi, startDate, endDate, dbStatus]
    );

    const penelitianId = result.insertId;

    await conn.query(
      `INSERT INTO research_members (research_id, lecturer_id, role, created_at, updated_at)
       VALUES (?, ?, '${ROLE_KETUA}', NOW(), NOW())`,
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

  const dbStatus = mapStatusToDb(status);
  const startDate = tahun_mulai ? `${tahun_mulai}-01-01` : '1970-01-01';
  const endDate = tahun_selesai ? `${tahun_selesai}-12-31` : null;

  const [result] = await db.query(
    `UPDATE research
     SET title = ?, description = ?, start_date = ?, end_date = ?, status = ?, updated_at = NOW()
     WHERE id = ?`,
    [judul, deskripsi, startDate, endDate, dbStatus, penelitianId]
  );
  return result.affectedRows > 0;
}

// ── Hapus penelitian ─────────────────────────────────────────────────────────
async function deletePenelitian(penelitianId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM research_members WHERE research_id = ?', [penelitianId]);
    const [result] = await conn.query('DELETE FROM research WHERE id = ?', [penelitianId]);
    await conn.commit();
    return result.affectedRows > 0;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ── Tambah anggota ke penelitian ─────────────────────────────────────────────
async function addAnggotaPenelitian(penelitianId, dosenId) {
  const conn = await db.getConnection();
  try {
    const dosenName = await resolveUserName(conn, dosenId);
    await ensureLecturerProfile(conn, dosenId, dosenName);

    const [result] = await conn.query(
      `INSERT INTO research_members (research_id, lecturer_id, role, created_at, updated_at)
       VALUES (?, ?, '${ROLE_PENDING}', NOW(), NOW())`,
      [penelitianId, dosenId]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('Dosen sudah terdaftar sebagai anggota penelitian ini.');
    }
    throw err;
  } finally {
    conn.release();
  }
}

// ── Update status keanggotaan (approve / reject) ─────────────────────────────
async function updateStatusAnggota(penelitianId, dosenId, status) {
  if (status === 'approved') {
    const [result] = await db.query(
      `UPDATE research_members
       SET role = '${ROLE_ANGGOTA}', updated_at = NOW()
       WHERE research_id = ? AND lecturer_id = ? AND role = '${ROLE_PENDING}'`,
      [penelitianId, dosenId]
    );
    return result.affectedRows > 0;
  }

  if (status === 'rejected') {
    const [result] = await db.query(
      `DELETE FROM research_members
       WHERE research_id = ? AND lecturer_id = ? AND role = '${ROLE_PENDING}'`,
      [penelitianId, dosenId]
    );
    return result.affectedRows > 0;
  }

  return false;
}

// ── Hapus anggota dari penelitian ────────────────────────────────────────────
async function removeAnggotaPenelitian(penelitianId, dosenId) {
  const [result] = await db.query(
    `DELETE FROM research_members
     WHERE research_id = ? AND lecturer_id = ? AND role IN ('${ROLE_ANGGOTA}', '${ROLE_PENDING}')`,
    [penelitianId, dosenId]
  );
  return result.affectedRows > 0;
}

// ── Cari penelitian berdasarkan keyword ─────────────────────────────────────
async function searchPenelitian(keyword, dosenId = null) {
  let query = `
    SELECT DISTINCT
      p.id, p.title AS judul, p.description AS deskripsi,
      YEAR(p.start_date) AS tahun_mulai, YEAR(p.end_date) AS tahun_selesai,
      p.status AS raw_status,
      p.created_at, p.updated_at,
      k.lecturer_id AS ketua_id,
      u.name  AS ketua_name,
      u.email AS ketua_email,
      COUNT(DISTINCT ap.id) AS total_anggota,
      COUNT(DISTINCT ap.id) AS anggota_approved
    FROM research p
    ${KETUA_JOIN}
    LEFT JOIN research_members ap ON p.id = ap.research_id
    WHERE (p.title LIKE ? OR p.description LIKE ? OR u.name LIKE ?)
  `;

  const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

  if (dosenId) {
    query += ' AND (k.lecturer_id = ? OR ap.lecturer_id = ?)';
    params.push(dosenId, dosenId);
  }

  query += ' GROUP BY p.id, k.lecturer_id, u.name, u.email ORDER BY p.created_at DESC';

  const [rows] = await db.query(query, params);
  return rows.map(mapPenelitianRow);
}

// ── Ambil semua dosen (untuk dropdown tambah anggota) ───────────────────────
async function getAllDosen() {
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email
    FROM users u
    INNER JOIN lecturers l ON l.id = u.id
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
    LEFT JOIN roles r ON r.id = mhr.role_id
    WHERE COALESCE(r.name, 'dosen') = 'dosen'
    ORDER BY u.name
  `, [MODEL_TYPE]);
  return rows;
}

// ── Ambil dosen yang belum terdaftar di penelitian tertentu ─────────────────
async function getAvailableDosen(penelitianId) {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     INNER JOIN lecturers l ON l.id = u.id
     LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = ?
     LEFT JOIN roles r ON r.id = mhr.role_id
     WHERE COALESCE(r.name, 'dosen') = 'dosen'
       AND u.id NOT IN (
         SELECT lecturer_id FROM research_members WHERE research_id = ?
       )
     ORDER BY u.name`,
    [MODEL_TYPE, penelitianId]
  );
  return rows;
}

module.exports = {
  getAllPenelitian,
  getPenelitianByDosenId,
  getPendingInvitations,
  getPenelitianStats,
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
