const db = require('./database');

// ===== PENELITIAN QUERIES =====

/**
 * Get all penelitian (untuk dashboard - semua dosen bisa lihat)
 */
async function getAllPenelitian() {
  const [rows] = await db.query(`
    SELECT 
      p.*,
      u.name as ketua_name,
      u.email as ketua_email,
      COUNT(DISTINCT ap.id) as total_anggota,
      COUNT(DISTINCT CASE WHEN ap.status = 'approved' THEN ap.id END) as anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN anggota_penelitian ap ON p.id = ap.penelitian_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

/**
 * Get penelitian by dosen ID (penelitian yang dosen terlibat sebagai ketua atau anggota)
 */
async function getPenelitianByDosenId(dosenId) {
  const [rows] = await db.query(`
    SELECT DISTINCT
      p.*,
      u.name as ketua_name,
      u.email as ketua_email,
      ap.role as my_role,
      ap.status as my_status,
      COUNT(DISTINCT ap2.id) as total_anggota,
      COUNT(DISTINCT CASE WHEN ap2.status = 'approved' THEN ap2.id END) as anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN anggota_penelitian ap ON p.id = ap.penelitian_id AND ap.dosen_id = ?
    LEFT JOIN anggota_penelitian ap2 ON p.id = ap2.penelitian_id
    WHERE p.ketua_id = ? OR ap.dosen_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [dosenId, dosenId, dosenId]);
  return rows;
}

/**
 * Get penelitian by ID with full details
 */
async function getPenelitianById(penelitianId) {
  const [rows] = await db.query(`
    SELECT 
      p.*,
      u.name as ketua_name,
      u.email as ketua_email
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    WHERE p.id = ?
  `, [penelitianId]);
  return rows[0];
}

/**
 * Get anggota penelitian by penelitian ID
 */
async function getAnggotaPenelitian(penelitianId) {
  const [rows] = await db.query(`
    SELECT 
      ap.*,
      u.name as dosen_name,
      u.email as dosen_email
    FROM anggota_penelitian ap
    LEFT JOIN users u ON ap.dosen_id = u.id
    WHERE ap.penelitian_id = ?
    ORDER BY ap.role DESC, ap.status, ap.created_at
  `, [penelitianId]);
  return rows;
}

/**
 * Check if user is ketua of penelitian
 */
async function isKetuaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(`
    SELECT id FROM penelitian WHERE id = ? AND ketua_id = ?
  `, [penelitianId, userId]);
  return rows.length > 0;
}

/**
 * Check if user is anggota of penelitian
 */
async function isAnggotaPenelitian(penelitianId, userId) {
  const [rows] = await db.query(`
    SELECT id FROM anggota_penelitian 
    WHERE penelitian_id = ? AND dosen_id = ?
  `, [penelitianId, userId]);
  return rows.length > 0;
}

/**
 * Get user role in penelitian
 */
async function getUserRoleInPenelitian(penelitianId, userId) {
  const [rows] = await db.query(`
    SELECT role, status FROM anggota_penelitian 
    WHERE penelitian_id = ? AND dosen_id = ?
  `, [penelitianId, userId]);
  return rows[0];
}

/**
 * Create new penelitian
 */
async function createPenelitian(data) {
  const { judul, deskripsi, tahun_mulai, tahun_selesai, status, ketua_id } = data;
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Insert penelitian
    const [result] = await connection.query(`
      INSERT INTO penelitian (judul, deskripsi, tahun_mulai, tahun_selesai, status, ketua_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [judul, deskripsi, tahun_mulai, tahun_selesai, status || 'draft', ketua_id]);
    
    const penelitianId = result.insertId;
    
    // Auto-add ketua as anggota with approved status
    await connection.query(`
      INSERT INTO anggota_penelitian (penelitian_id, dosen_id, role, status)
      VALUES (?, ?, 'Ketua', 'approved')
    `, [penelitianId, ketua_id]);
    
    await connection.commit();
    return penelitianId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Update penelitian (only ketua can update)
 */
async function updatePenelitian(penelitianId, data) {
  const { judul, deskripsi, tahun_mulai, tahun_selesai, status } = data;
  
  const [result] = await db.query(`
    UPDATE penelitian 
    SET judul = ?, deskripsi = ?, tahun_mulai = ?, tahun_selesai = ?, status = ?
    WHERE id = ?
  `, [judul, deskripsi, tahun_mulai, tahun_selesai, status, penelitianId]);
  
  return result.affectedRows > 0;
}

/**
 * Delete penelitian (only ketua can delete)
 */
async function deletePenelitian(penelitianId) {
  const [result] = await db.query(`
    DELETE FROM penelitian WHERE id = ?
  `, [penelitianId]);
  
  return result.affectedRows > 0;
}

/**
 * Add anggota to penelitian (only ketua can add)
 */
async function addAnggotaPenelitian(penelitianId, dosenId) {
  try {
    const [result] = await db.query(`
      INSERT INTO anggota_penelitian (penelitian_id, dosen_id, role, status)
      VALUES (?, ?, 'Anggota', 'pending')
    `, [penelitianId, dosenId]);
    
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('Dosen sudah terdaftar sebagai anggota penelitian ini');
    }
    throw err;
  }
}

/**
 * Update status anggota (approve/reject by anggota themselves)
 */
async function updateStatusAnggota(penelitianId, dosenId, status) {
  const [result] = await db.query(`
    UPDATE anggota_penelitian 
    SET status = ?
    WHERE penelitian_id = ? AND dosen_id = ?
  `, [status, penelitianId, dosenId]);
  
  return result.affectedRows > 0;
}

/**
 * Remove anggota from penelitian (only ketua can remove)
 */
async function removeAnggotaPenelitian(penelitianId, dosenId) {
  const [result] = await db.query(`
    DELETE FROM anggota_penelitian 
    WHERE penelitian_id = ? AND dosen_id = ? AND role = 'Anggota'
  `, [penelitianId, dosenId]);
  
  return result.affectedRows > 0;
}

/**
 * Search penelitian by keyword
 */
async function searchPenelitian(keyword, dosenId = null) {
  let query = `
    SELECT DISTINCT
      p.*,
      u.name as ketua_name,
      u.email as ketua_email,
      COUNT(DISTINCT ap.id) as total_anggota,
      COUNT(DISTINCT CASE WHEN ap.status = 'approved' THEN ap.id END) as anggota_approved
    FROM penelitian p
    LEFT JOIN users u ON p.ketua_id = u.id
    LEFT JOIN anggota_penelitian ap ON p.id = ap.penelitian_id
    WHERE (p.judul LIKE ? OR p.deskripsi LIKE ? OR u.name LIKE ?)
  `;
  
  const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
  
  if (dosenId) {
    query += ` AND (p.ketua_id = ? OR ap.dosen_id = ?)`;
    params.push(dosenId, dosenId);
  }
  
  query += ` GROUP BY p.id ORDER BY p.created_at DESC`;
  
  const [rows] = await db.query(query, params);
  return rows;
}

/**
 * Get all dosen (for adding anggota)
 */
async function getAllDosen() {
  const [rows] = await db.query(`
    SELECT id, name, email FROM users ORDER BY name
  `);
  return rows;
}

/**
 * Get available dosen (not yet in penelitian)
 */
async function getAvailableDosen(penelitianId) {
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email 
    FROM users u
    WHERE u.id NOT IN (
      SELECT dosen_id FROM anggota_penelitian WHERE penelitian_id = ?
    )
    ORDER BY u.name
  `, [penelitianId]);
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
  getAvailableDosen
};
