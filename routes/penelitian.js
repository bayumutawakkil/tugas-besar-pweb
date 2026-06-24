'use strict';

const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { checkAuth }                          = require('../middleware/auth');
const { ROLES, checkRole, checkOwnership,
        checkCanView, checkAnggotaSelf }     = require('../middleware/acl');
const { preventIdManipulation,
        validatePenelitianData }             = require('../middleware/validator');
const ctrl                                   = require('../controllers/penelitianController');

// ── Upload file Excel (di memori, tidak ke disk) ─────────────────────────────
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

// Shortcut guard: dosen & admin (untuk view/overview)
const requireDosen = [checkAuth, checkRole(ROLES.DOSEN, ROLES.ADMIN)];

// Shortcut guard: HANYA DOSEN (untuk aksi yang mengubah data)
const requireStrictDosen = [checkAuth, checkRole(ROLES.DOSEN)];

// ══════════════════════════════════════════════════════════════════════════════
//  PENTING: rute statis HARUS dideklarasi SEBELUM rute dinamis (/:id)
// ══════════════════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard',    ...requireDosen, ctrl.showDashboard);

// ── Data Penelitian Saya ──────────────────────────────────────────────────────
router.get('/my-penelitian', ...requireStrictDosen, ctrl.showMyPenelitian);

// ── Undangan Penelitian ───────────────────────────────────────────────────────
router.get('/undangan', ...requireStrictDosen, ctrl.showInvitations);

// ── Pencarian ─────────────────────────────────────────────────────────────────
router.get('/search', ...requireDosen, ctrl.handleSearch);

// ── Import Excel ──────────────────────────────────────────────────────────────
router.get ('/import', ...requireStrictDosen, ctrl.showImportForm);
router.post('/import', ...requireStrictDosen, upload.single('file_excel'), ctrl.handleImport);

// ── Export ────────────────────────────────────────────────────────────────────
router.get('/export/excel', ...requireDosen, ctrl.exportExcel);
router.get('/export/pdf',   ...requireDosen, ctrl.exportPdf);

// ── Tambah Penelitian ─────────────────────────────────────────────────────────
router.get ('/create', ...requireStrictDosen, ctrl.showCreateForm);
router.post('/create', ...requireStrictDosen, validatePenelitianData, ctrl.handleCreate);

// ── Detail Penelitian ─────────────────────────────────────────────────────────
router.get('/:id', checkAuth, checkCanView, ctrl.showDetail);

// ── Edit Penelitian ───────────────────────────────────────────────────────────
router.get ('/:id/edit',   ...requireStrictDosen, checkOwnership, ctrl.showEditForm);
router.post('/:id/update', ...requireStrictDosen, checkOwnership, preventIdManipulation, validatePenelitianData, ctrl.handleUpdate);

// ── Hapus Penelitian ──────────────────────────────────────────────────────────
router.post('/:id/delete', ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleDelete);

// ── Kelola Anggota ────────────────────────────────────────────────────────────
router.get ('/:id/anggota',        ...requireStrictDosen, checkOwnership, ctrl.showManageAnggota);
router.post('/:id/anggota/add',    ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleAddAnggota);
router.post('/:id/anggota/remove', ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleRemoveAnggota);

// ── Update Status Keanggotaan (oleh anggota sendiri) ─────────────────────────
router.post('/:id/membership/update', checkAuth, checkAnggotaSelf, preventIdManipulation, ctrl.handleUpdateMembership);

// ── Export CSV Anggota ────────────────────────────────────────────────────────
router.get('/:id/export', checkAuth, checkOwnership, ctrl.exportAnggotaCsv);

module.exports = router;
