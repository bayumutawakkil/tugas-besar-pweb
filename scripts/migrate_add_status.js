require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'pweb_ftirda',
    });

    // Cek apakah kolom sudah ada
    const [cols] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'"
    );

    if (cols.length > 0) {
      console.log('INFO: kolom `status` sudah ada, tidak perlu ditambahkan.');
    } else {
      await conn.execute(
        "ALTER TABLE `users` ADD COLUMN `status` ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif' AFTER `role`"
      );
      console.log('OK: kolom `status` berhasil ditambahkan ke tabel users.');
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    if (conn) await conn.end();
  }
})();
