'use strict';

const MODEL_TYPE = 'App\\Models\\User';

function mapDbStatus(status) {
  if (status === 'inactive') return 'nonaktif';
  if (status === 'active') return 'aktif';
  return status || 'aktif';
}

async function getOrCreateDefaultOrgUnit(conn) {
  const [rows] = await conn.execute('SELECT id FROM organization_units LIMIT 1');
  if (rows.length) return rows[0].id;

  const [result] = await conn.execute(
    `INSERT INTO organization_units (name, code, type, organization_unit_id, created_at, updated_at)
     VALUES ('FTI', 'FTI', 'faculty', 1, NOW(), NOW())`
  );
  const id = result.insertId;
  await conn.execute('UPDATE organization_units SET organization_unit_id = ? WHERE id = ?', [id, id]);
  return id;
}

async function getOrCreateDefaultEmploymentStatus(conn) {
  const [rows] = await conn.execute('SELECT id FROM employment_statuses LIMIT 1');
  if (rows.length) return rows[0].id;

  const [result] = await conn.execute(
    `INSERT INTO employment_statuses (name, created_at, updated_at) VALUES ('Permanent', NOW(), NOW())`
  );
  return result.insertId;
}

async function ensureRoles(conn) {
  for (const role of ['admin', 'dosen']) {
    const [existing] = await conn.execute(
      'SELECT id FROM roles WHERE name = ? AND guard_name = ? LIMIT 1',
      [role, 'web']
    );
    if (existing.length) continue;

    await conn.execute(
      'INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [role, 'web']
    );
  }
}

async function ensureEmployeeRecord(conn, userId, name) {
  const [employees] = await conn.execute('SELECT id FROM employees WHERE id = ?', [userId]);
  if (employees.length) return;

  const orgUnitId = await getOrCreateDefaultOrgUnit(conn);
  const empStatusId = await getOrCreateDefaultEmploymentStatus(conn);
  const empNumber = `EMP${String(userId).padStart(6, '0')}`;

  await conn.execute(
    `INSERT INTO employees (
       id, employee_number, name, birth_place, birth_date, gender, marital_status,
       address, organization_unit_id, hire_date, employment_status_id, status,
       created_at, updated_at
     ) VALUES (?, ?, ?, '-', '1990-01-01', 'male', 'single', '-', ?, CURDATE(), ?, 'active', NOW(), NOW())`,
    [userId, empNumber, name, orgUnitId, empStatusId]
  );
}

async function ensureLecturerProfile(conn, userId, name) {
  const [lecturers] = await conn.execute('SELECT id FROM lecturers WHERE id = ?', [userId]);
  if (lecturers.length) return;

  await ensureEmployeeRecord(conn, userId, name);

  await conn.execute(
    `INSERT INTO lecturers (id, academic_rank, created_at, updated_at)
     VALUES (?, 'Assistant Professor', NOW(), NOW())`,
    [userId]
  );
}

async function resolveUserName(conn, userId) {
  const [rows] = await conn.execute('SELECT name FROM users WHERE id = ?', [userId]);
  return rows[0]?.name || 'Unknown';
}

module.exports = {
  MODEL_TYPE,
  mapDbStatus,
  ensureRoles,
  ensureLecturerProfile,
  resolveUserName,
};
