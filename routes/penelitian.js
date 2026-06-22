/**
 * Router: Pengelolaan Data Penelitian
 * NIM  : 2411522023
 * Nama : Bayu Mutawakkil
 *
 * Semua rute di sini dilindungi oleh:
 *  1. checkAuth   – memastikan user sudah login (JWT valid)
 *  2. checkRole   – memastikan role user adalah dosen / admin
 *  3. checkOwnership – pada operasi write, memastikan user adalah ketua penelitian
 *
 * Import Excel menggunakan multer (memori, tanpa disk).
 */

'use strict';

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
    res.status(500).render('error', { message: 'Gagal memuat dashboard penelitian' });
  }
});

router.get('/my-penelitian', checkAuth, async (req, res) => {
  try {
    const penelitianList = await getPenelitianByDosenId(req.user.id);
    res.render('penelitian/my-penelitian', { user: req.user, penelitianList });
  } catch (err) {
    res.status(500).render('error', { message: 'Gagal memuat data penelitian Anda' });
  }
const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { checkAuth }    = require('../config');
const { ROLES, checkRole, checkOwnership, checkCanView } =
  require('../middleware/accessControlList');
const { preventIdManipulation } =
  require('../middleware/penelitianAuth');

const ctrl = require('../controllers/penelitianController');

// ── Multer: simpan file di memori (tidak ke disk) ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // maks 5 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx/.xls) yang diizinkan.'));
    }
  },
});

// ── Guard role: hanya dosen & admin ────────────────────────────────────────
const requireDosen = [checkAuth, checkRole(ROLES.DOSEN, ROLES.ADMIN)];

// ══════════════════════════════════════════════════════════════════════════
//  URUTAN ROUTE PENTING:
//  Rute statis (/dashboard, /my-penelitian, /search, dst.) HARUS dideklarasi
//  SEBELUM rute dinamis (/:id) agar Express tidak salah mencocokkan.
// ══════════════════════════════════════════════════════════════════════════

// ── 1. Dashboard – daftar semua penelitian ──────────────────────────────
router.get('/dashboard', ...requireDosen, ctrl.showDashboard);

// ── 2. Data Penelitian Saya ─────────────────────────────────────────────
router.get('/my-penelitian', ...requireDosen, ctrl.showMyPenelitian);

// ── 3. Cari penelitian ──────────────────────────────────────────────────
router.get('/search', ...requireDosen, ctrl.handleSearch);

// ── 4. Impor dari Excel ─────────────────────────────────────────────────
router.get('/import', ...requireDosen, ctrl.showImportForm);

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
      res.redirect('/penelitian/my-penelitian');
    } catch (err) {
      console.error('Error creating penelitian:', err);
      res.render('penelitian/create', {
        user: req.user,
        error: 'Gagal membuat penelitian. ' + err.message,
      });
    }
  }
  '/import',
  ...requireDosen,
  upload.single('file_excel'),
  ctrl.handleImport
);

// ── 5. Ekspor Excel ─────────────────────────────────────────────────────
router.get('/export/excel', ...requireDosen, ctrl.exportExcel);

// ── 6. Ekspor PDF ───────────────────────────────────────────────────────
router.get('/export/pdf', ...requireDosen, ctrl.exportPdf);

// ── 7. Form tambah penelitian ───────────────────────────────────────────
router.get('/create', ...requireDosen, ctrl.showCreateForm);

router.post('/create', ...requireDosen, ctrl.handleCreate);

// ── 8. Detail penelitian ────────────────────────────────────────────────
//    checkCanView membolehkan ketua, anggota, dan admin melihat detail.
router.get('/:id', checkAuth, checkCanView, ctrl.showDetail);

// ── 9. Form edit penelitian ─────────────────────────────────────────────
router.get(
  '/:id/edit',
  ...requireDosen,
  checkOwnership,
  ctrl.showEditForm
);

// ── 10. Proses update ───────────────────────────────────────────────────
router.post(
  '/:id/update',
  ...requireDosen,
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

      res.redirect('/penelitian/my-penelitian');
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
  ctrl.handleUpdate
);

// ── 11. Hapus penelitian ────────────────────────────────────────────────
router.post(
  '/:id/delete',
  ...requireDosen,
  checkOwnership,
  preventIdManipulation,
  ctrl.handleDelete
);

// ── 12. Kelola anggota ──────────────────────────────────────────────────
const {
  getAnggotaPenelitian,
  getPenelitianById,
  addAnggotaPenelitian,
  removeAnggotaPenelitian,
  updateStatusAnggota,
  getAvailableDosen,
} = require('../config/penelitian');
const { checkAnggotaSelf } = require('../middleware/accessControlList');

router.get(
  '/:id/anggota',
  ...requireDosen,
  checkOwnership,
  async (req, res) => {
    try {
      const penelitianId   = req.params.id;
      const penelitian     = req.penelitian || await getPenelitianById(penelitianId);
      const anggotaList    = await getAnggotaPenelitian(penelitianId);
      const availableDosen = await getAvailableDosen(penelitianId);

      return res.render('penelitian/manage-anggota', {
        user: req.user, penelitian, anggotaList, availableDosen,
        errors: [], flashType: null, flashMsg: null,
      });
    } catch (err) {
      console.error('Error load manage-anggota:', err);
      return res.status(500).render('error', { message: 'Gagal memuat halaman kelola anggota.' });
    }
  }
);

router.post(
  '/:id/anggota/add',
  ...requireDosen,
  checkOwnership,
  preventIdManipulation,
  async (req, res) => {
    const penelitianId = req.params.id;
    try {
      const dosenId = req.body.dosen_id;
      if (!dosenId) throw new Error('Dosen harus dipilih.');
      await addAnggotaPenelitian(penelitianId, dosenId);
      return res.redirect(`/penelitian/${penelitianId}/anggota`);
    } catch (err) {
      const penelitian     = await getPenelitianById(penelitianId);
      const anggotaList    = await getAnggotaPenelitian(penelitianId);
      const availableDosen = await getAvailableDosen(penelitianId);
      return res.render('penelitian/manage-anggota', {
        user: req.user, penelitian, anggotaList, availableDosen,
        errors: [err.message], flashType: null, flashMsg: null,
      });
    }
  }
);

router.post(
  '/:id/anggota/remove',
  ...requireDosen,
  checkOwnership,
  preventIdManipulation,
  async (req, res) => {
    try {
      const dosenId = req.body.dosen_id;
      if (!dosenId) throw new Error('Dosen ID tidak valid.');
      await removeAnggotaPenelitian(req.params.id, dosenId);
      return res.redirect(`/penelitian/${req.params.id}/anggota`);
    } catch (err) {
      console.error('Error remove anggota:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── 13. Update status keanggotaan (oleh anggota sendiri) ────────────────
router.post(
  '/:id/membership/update',
  checkAuth,
  checkAnggotaSelf,
  preventIdManipulation,
  async (req, res) => {
    try {
      const status = req.body.status;

      if (!['approved', 'rejected'].includes(status)) {
        throw new Error('Status tidak valid');
      }

      const success = await updateStatusAnggota(penelitianId, req.user.id, status);
      if (!success) throw new Error('Gagal mengupdate status keanggotaan');

      res.redirect('/penelitian/my-penelitian');
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
      if (!['approved', 'rejected'].includes(status)) throw new Error('Status tidak valid.');
      await updateStatusAnggota(req.params.id, req.user.id, status);
      return res.redirect(`/penelitian/${req.params.id}`);
    } catch (err) {
      console.error('Error update membership:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
