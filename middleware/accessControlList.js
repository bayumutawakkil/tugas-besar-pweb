const { getPenelitianById, getAnggotaPenelitian } = require('../config/penelitian');

const ROLES = {
  ADMIN:   'admin',
  DOSEN:   'dosen',
  ANGGOTA: 'anggota',
};

function resolveRole(req) {
  return (req.user && req.user.role) ? req.user.role.toLowerCase() : ROLES.ANGGOTA;
}

function checkRole(...allowedRoles) {
  const allowed = allowedRoles.flat().map(r => r.toLowerCase());

  return (req, res, next) => {
    const role = resolveRole(req);

    if (allowed.includes(role)) {
      return next();
    }

    if (req.accepts('json') || req.xhr) {
      return res.status(403).json({
        error: 'Akses ditolak. Anda tidak memiliki hak untuk melakukan tindakan ini.',
        required_roles: allowed,
        your_role: role,
      });
    }

    return res.status(403).render('error', {
      message: 'Akses ditolak. Anda tidak memiliki izin untuk halaman ini.',
    });
  };
}

async function checkOwnership(req, res, next) {
  try {
    const role = resolveRole(req);

    if (role === ROLES.ADMIN) {
      return next();
    }

    const penelitianId = req.params.id;
    if (!penelitianId) {
      return res.status(400).render('error', { message: 'ID penelitian tidak ditemukan.' });
    }

    const penelitian = await getPenelitianById(penelitianId);
    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    if (Number(penelitian.ketua_id) !== Number(req.user.id)) {
      if (req.accepts('json') || req.xhr) {
        return res.status(403).json({
          error: 'Hanya ketua penelitian yang dapat melakukan tindakan ini.',
        });
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

async function checkAnggotaSelf(req, res, next) {
  try {
    const role = resolveRole(req);

    if (role === ROLES.ADMIN) {
      return next();
    }

    const penelitianId = req.params.id;
    const anggotaList = await getAnggotaPenelitian(penelitianId);
    const isMember = anggotaList.some(a => Number(a.dosen_id) === Number(req.user.id));

    if (!isMember) {
      if (req.accepts('json') || req.xhr) {
        return res.status(403).json({
          error: 'Anda bukan anggota penelitian ini.',
        });
      }
      return res.status(403).render('error', {
        message: 'Anda bukan anggota penelitian ini.',
      });
    }

    next();
  } catch (err) {
    console.error('[ACL] checkAnggotaSelf error:', err);
    next(err);
  }
}

async function checkCanView(req, res, next) {
  try {
    const role = resolveRole(req);

    if (role === ROLES.ADMIN) return next();

    const penelitianId = req.params.id;
    const penelitian = await getPenelitianById(penelitianId);

    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    if (Number(penelitian.ketua_id) === Number(req.user.id)) {
      req.penelitian = penelitian;
      return next();
    }

    const anggotaList = await getAnggotaPenelitian(penelitianId);
    const isMember = anggotaList.some(a => Number(a.dosen_id) === Number(req.user.id));

    if (isMember) {
      req.penelitian = penelitian;
      return next();
    }

    if (req.accepts('json') || req.xhr) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke penelitian ini.' });
    }
    return res.status(403).render('error', {
      message: 'Anda tidak memiliki akses ke penelitian ini.',
    });
  } catch (err) {
    console.error('[ACL] checkCanView error:', err);
    next(err);
  }
}

function signTokenWithRole(user, jwt, JWT_SECRET) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || ROLES.ANGGOTA },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  ROLES,
  checkRole,
  checkOwnership,
  checkAnggotaSelf,
  checkCanView,
  signTokenWithRole,
};