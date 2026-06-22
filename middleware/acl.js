'use strict';

const { getPenelitianById, getAnggotaPenelitian } = require('../models/penelitianModel');

const ROLES = {
  ADMIN:   'admin',
  DOSEN:   'dosen',
};

function resolveRole(req) {
  return (req.user && req.user.role) ? req.user.role.toLowerCase() : ROLES.DOSEN;
}

/**
 * Middleware: Batasi akses berdasarkan role.
 * Contoh: checkRole(ROLES.DOSEN, ROLES.ADMIN)
 */
function checkRole(...allowedRoles) {
  const allowed = allowedRoles.flat().map(r => r.toLowerCase());

  return (req, res, next) => {
    const role = resolveRole(req);

    if (allowed.includes(role)) return next();

    if (req.accepts('json') || req.xhr) {
      return res.status(403).json({
        error:          'Akses ditolak.',
        required_roles: allowed,
        your_role:      role,
      });
    }

    return res.status(403).render('error', {
      message: 'Akses ditolak. Anda tidak memiliki izin untuk halaman ini.',
    });
  };
}

/**
 * Middleware: Pastikan user adalah ketua penelitian (atau admin).
 * Menyimpan data penelitian ke req.penelitian jika lolos.
 */
async function checkOwnership(req, res, next) {
  try {
    const role = resolveRole(req);
    if (role === ROLES.ADMIN) return next();

    const penelitian = await getPenelitianById(req.params.id);
    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    if (Number(penelitian.ketua_id) !== Number(req.user.id)) {
      if (req.accepts('json') || req.xhr) {
        return res.status(403).json({ error: 'Hanya ketua penelitian yang dapat melakukan tindakan ini.' });
      }
      return res.status(403).render('error', {
        message: 'Hanya ketua penelitian yang dapat melakukan tindakan ini.',
      });
    }

    req.penelitian = penelitian;
    next();
  } catch (err) {
    console.error('[ACL] checkOwnership error:', err);
    next(err);
  }
}

/**
 * Middleware: Pastikan user adalah anggota penelitian (atau admin).
 */
async function checkAnggotaSelf(req, res, next) {
  try {
    const role = resolveRole(req);
    if (role === ROLES.ADMIN) return next();

    const anggotaList = await getAnggotaPenelitian(req.params.id);
    const isMember = anggotaList.some(a => Number(a.dosen_id) === Number(req.user.id));

    if (!isMember) {
      if (req.accepts('json') || req.xhr) {
        return res.status(403).json({ error: 'Anda bukan anggota penelitian ini.' });
      }
      return res.status(403).render('error', { message: 'Anda bukan anggota penelitian ini.' });
    }

    next();
  } catch (err) {
    console.error('[ACL] checkAnggotaSelf error:', err);
    next(err);
  }
}

/**
 * Middleware: Izinkan ketua, anggota, dan admin untuk melihat detail penelitian.
 */
async function checkCanView(req, res, next) {
  try {
    const role = resolveRole(req);
    if (role === ROLES.ADMIN) return next();

    const penelitian = await getPenelitianById(req.params.id);
    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    if (Number(penelitian.ketua_id) === Number(req.user.id)) {
      req.penelitian = penelitian;
      return next();
    }

    const anggotaList = await getAnggotaPenelitian(req.params.id);
    const isMember = anggotaList.some(a => Number(a.dosen_id) === Number(req.user.id));

    if (isMember) {
      req.penelitian = penelitian;
      return next();
    }

    if (req.accepts('json') || req.xhr) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke penelitian ini.' });
    }
    return res.status(403).render('error', { message: 'Anda tidak memiliki akses ke penelitian ini.' });
  } catch (err) {
    console.error('[ACL] checkCanView error:', err);
    next(err);
  }
}

module.exports = { ROLES, checkRole, checkOwnership, checkAnggotaSelf, checkCanView };
