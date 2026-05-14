const express = require('express');
const router = express.Router();
const { checkAuth } = require('../config');
const {
  preventIdManipulation,
  validatePenelitianData,
} = require('../middleware/penelitianAuth');
const {
  ROLES,
  checkRole,
  checkOwnership,
  checkAnggotaSelf,
  checkCanView,
} = require('../middleware/accessControlList');

const {
  getAllPenelitian,
  getPenelitianByDosenId,
  getPenelitianById,
  getAnggotaPenelitian,
  createPenelitian,
  updatePenelitian,
  deletePenelitian,
  addAnggotaPenelitian,
  updateStatusAnggota,
  removeAnggotaPenelitian,
  searchPenelitian,
  getAllDosen,
  getAvailableDosen,
} = require('../config/penelitian');

router.get('/dashboard', checkAuth, async (req, res) => {
  try {
    const penelitianList = await getAllPenelitian();
    res.render('penelitian/dashboard', { user: req.user, penelitianList });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).render('error', { message: 'Gagal memuat dashboard penelitian' });
  }
});

router.get('/my-penelitian', checkAuth, async (req, res) => {
  try {
    const penelitianList = await getPenelitianByDosenId(req.user.id);
    res.render('penelitian/my-penelitian', { user: req.user, penelitianList });
  } catch (err) {
    console.error('Error loading my penelitian:', err);
    res.status(500).render('error', { message: 'Gagal memuat data penelitian Anda' });
  }
});

router.get('/search', checkAuth, async (req, res) => {
  try {
    const keyword = req.query.q || '';
    const scope = req.query.scope || 'all';

    if (!keyword.trim()) return res.redirect('/penelitian/dashboard');

    const dosenId = scope === 'mine' ? req.user.id : null;
    const penelitianList = await searchPenelitian(keyword, dosenId);

    res.render('penelitian/search-results', {
      user: req.user,
      penelitianList,
      keyword,
      scope,
    });
  } catch (err) {
    console.error('Error searching penelitian:', err);
    res.status(500).render('error', { message: 'Gagal melakukan pencarian' });
  }
});

router.get(
  '/create',
  checkAuth,
  checkRole(ROLES.DOSEN, ROLES.ADMIN),
  (req, res) => {
    res.render('penelitian/create', { user: req.user, error: null });
  }
);

router.post(
  '/create',
  checkAuth,
  checkRole(ROLES.DOSEN, ROLES.ADMIN),
  validatePenelitianData,
  async (req, res) => {
    try {
      const data = {
        judul:         req.body.judul,
        deskripsi:     req.body.deskripsi,
        tahun_mulai:   req.body.tahun_mulai,
        tahun_selesai: req.body.tahun_selesai || null,
        status:        req.body.status || 'draft',
        ketua_id:      req.user.id,
      };

      const penelitianId = await createPenelitian(data);
      res.redirect(`/penelitian/${penelitianId}`);
    } catch (err) {
      console.error('Error creating penelitian:', err);
      res.render('penelitian/create', {
        user: req.user,
        error: 'Gagal membuat penelitian. ' + err.message,
      });
    }
  }
);

router.get('/:id', checkAuth, async (req, res) => {
  try {
    const penelitianId = req.params.id;
    const penelitian = await getPenelitianById(penelitianId);

    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan' });
    }

    const anggotaList = await getAnggotaPenelitian(penelitianId);
    const isKetua = Number(penelitian.ketua_id) === Number(req.user.id);
    const role = req.user.role || ROLES.ANGGOTA;

    res.render('penelitian/detail', {
      user: req.user,
      penelitian,
      anggotaList,
      isKetua,
      isAdmin: role === ROLES.ADMIN,
    });
  } catch (err) {
    console.error('Error loading penelitian detail:', err);
    res.status(500).render('error', { message: 'Gagal memuat detail penelitian' });
  }
});

router.get(
  '/:id/edit',
  checkAuth,
  checkOwnership,
  async (req, res) => {
    try {
      const penelitian = req.penelitian || await getPenelitianById(req.params.id);

      if (!penelitian) {
        return res.status(404).render('error', { message: 'Penelitian tidak ditemukan' });
      }

      res.render('penelitian/edit', { user: req.user, penelitian, error: null });
    } catch (err) {
      console.error('Error loading edit form:', err);
      res.status(500).render('error', { message: 'Gagal memuat form edit' });
    }
  }
);

router.post(
  '/:id/update',
  checkAuth,
  checkOwnership,
  preventIdManipulation,
  validatePenelitianData,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const data = {
        judul:         req.body.judul,
        deskripsi:     req.body.deskripsi,
        tahun_mulai:   req.body.tahun_mulai,
        tahun_selesai: req.body.tahun_selesai || null,
        status:        req.body.status,
      };

      const success = await updatePenelitian(penelitianId, data);
      if (!success) throw new Error('Gagal mengupdate penelitian');

      res.redirect(`/penelitian/${penelitianId}`);
    } catch (err) {
      console.error('Error updating penelitian:', err);
      const penelitian = await getPenelitianById(req.params.id);
      res.render('penelitian/edit', {
        user: req.user,
        penelitian,
        error: 'Gagal mengupdate penelitian. ' + err.message,
      });
    }
  }
);

router.post(
  '/:id/delete',
  checkAuth,
  checkOwnership,
  preventIdManipulation,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const success = await deletePenelitian(penelitianId);

      if (!success) throw new Error('Gagal menghapus penelitian');

      res.redirect('/penelitian/my-penelitian');
    } catch (err) {
      console.error('Error deleting penelitian:', err);
      res.status(500).json({ error: 'Gagal menghapus penelitian. ' + err.message });
    }
  }
);

router.get(
  '/:id/anggota',
  checkAuth,
  checkOwnership,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const penelitian = req.penelitian || await getPenelitianById(penelitianId);
      const anggotaList = await getAnggotaPenelitian(penelitianId);
      const availableDosen = await getAvailableDosen(penelitianId);

      res.render('penelitian/manage-anggota', {
        user: req.user,
        penelitian,
        anggotaList,
        availableDosen,
        error: null,
        success: null,
      });
    } catch (err) {
      console.error('Error loading manage anggota:', err);
      res.status(500).render('error', { message: 'Gagal memuat halaman kelola anggota' });
    }
  }
);

router.post(
  '/:id/anggota/add',
  checkAuth,
  checkOwnership,
  preventIdManipulation,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const dosenId = req.body.dosen_id;

      if (!dosenId) throw new Error('Dosen harus dipilih');

      await addAnggotaPenelitian(penelitianId, dosenId);
      res.redirect(`/penelitian/${penelitianId}/anggota`);
    } catch (err) {
      console.error('Error adding anggota:', err);
      const penelitian = await getPenelitianById(req.params.id);
      const anggotaList = await getAnggotaPenelitian(req.params.id);
      const availableDosen = await getAvailableDosen(req.params.id);

      res.render('penelitian/manage-anggota', {
        user: req.user,
        penelitian,
        anggotaList,
        availableDosen,
        error: err.message,
        success: null,
      });
    }
  }
);

router.post(
  '/:id/anggota/remove',
  checkAuth,
  checkOwnership,
  preventIdManipulation,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const dosenId = req.body.dosen_id;

      if (!dosenId) throw new Error('Dosen ID tidak valid');

      const success = await removeAnggotaPenelitian(penelitianId, dosenId);
      if (!success) throw new Error('Gagal menghapus anggota');

      res.redirect(`/penelitian/${penelitianId}/anggota`);
    } catch (err) {
      console.error('Error removing anggota:', err);
      res.status(500).json({ error: 'Gagal menghapus anggota. ' + err.message });
    }
  }
);

router.post(
  '/:id/membership/update',
  checkAuth,
  checkAnggotaSelf,
  preventIdManipulation,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const status = req.body.status;

      if (!['approved', 'rejected'].includes(status)) {
        throw new Error('Status tidak valid');
      }

      const success = await updateStatusAnggota(penelitianId, req.user.id, status);
      if (!success) throw new Error('Gagal mengupdate status keanggotaan');

      res.redirect(`/penelitian/${penelitianId}`);
    } catch (err) {
      console.error('Error updating membership:', err);
      res.status(500).json({ error: 'Gagal mengupdate status keanggotaan. ' + err.message });
    }
  }
);

router.get(
  '/:id/export',
  checkAuth,
  checkOwnership,
  async (req, res) => {
    try {
      const penelitianId = req.params.id;
      const anggotaList = await getAnggotaPenelitian(penelitianId);

      let csv = 'No,Nama Dosen,Email,Role,Status\n';
      anggotaList.forEach((anggota, index) => {
        csv += `${index + 1},"${anggota.dosen_name}","${anggota.dosen_email}","${anggota.role}","${anggota.status}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="penelitian_${penelitianId}_anggota.csv"`
      );
      res.send(csv);
    } catch (err) {
      console.error('Error exporting penelitian:', err);
      res.status(500).json({ error: 'Gagal export data penelitian' });
    }
  }
);

module.exports = router;