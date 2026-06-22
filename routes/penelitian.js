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

const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { checkAuth }    = require('../config');
const { ROLES, checkRole, checkOwnership, checkCanView, checkAnggotaSelf } =
  require('../middleware/accessControlList');
const { preventIdManipulation, validatePenelitianData } =
  require('../middleware/penelitianAuth');

const ctrl = require('../controllers/penelitianController');

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

// ── 2a. Undangan Penelitian ───────────────────────────────────────────────
router.get('/undangan', ...requireDosen, ctrl.showInvitations);

// ── 3. Cari penelitian ──────────────────────────────────────────────────
router.get('/search', ...requireDosen, ctrl.handleSearch);

// ── 4. Impor dari Excel ─────────────────────────────────────────────────
router.get('/import', ...requireDosen, ctrl.showImportForm);

router.post(
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

router.post('/create', ...requireDosen, validatePenelitianData, ctrl.handleCreate);

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
      if (!['approved', 'rejected'].includes(status)) throw new Error('Status tidak valid.');
      await updateStatusAnggota(req.params.id, req.user.id, status);
      return res.redirect(`/penelitian/${req.params.id}`);
    } catch (err) {
      console.error('Error update membership:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── 14. Export CSV anggota ──────────────────────────────────────────────
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
      console.error('Error export CSV:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
