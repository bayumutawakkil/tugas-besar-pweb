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


const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, 
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


const requireDosen = [checkAuth, checkRole(ROLES.DOSEN, ROLES.ADMIN)];


const requireStrictDosen = [checkAuth, checkRole(ROLES.DOSEN)];






router.get('/dashboard',    ...requireDosen, ctrl.showDashboard);


router.get('/my-penelitian', ...requireStrictDosen, ctrl.showMyPenelitian);


router.get('/undangan', ...requireStrictDosen, ctrl.showInvitations);


router.get('/search', ...requireDosen, ctrl.handleSearch);


router.get ('/import', ...requireStrictDosen, ctrl.showImportForm);
router.post('/import', ...requireStrictDosen, upload.single('file_excel'), ctrl.handleImport);


router.get('/export/excel', ...requireDosen, ctrl.exportExcel);
router.get('/export/pdf',   ...requireDosen, ctrl.exportPdf);


router.get ('/create', ...requireStrictDosen, ctrl.showCreateForm);
router.post('/create', ...requireStrictDosen, validatePenelitianData, ctrl.handleCreate);


router.get('/:id', checkAuth, checkCanView, ctrl.showDetail);


router.get ('/:id/edit',   ...requireStrictDosen, checkOwnership, ctrl.showEditForm);
router.post('/:id/update', ...requireStrictDosen, checkOwnership, preventIdManipulation, validatePenelitianData, ctrl.handleUpdate);


router.post('/:id/delete', ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleDelete);


router.get ('/:id/anggota',        ...requireStrictDosen, checkOwnership, ctrl.showManageAnggota);
router.post('/:id/anggota/add',    ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleAddAnggota);
router.post('/:id/anggota/remove', ...requireStrictDosen, checkOwnership, preventIdManipulation, ctrl.handleRemoveAnggota);


router.post('/:id/membership/update', checkAuth, checkAnggotaSelf, preventIdManipulation, ctrl.handleUpdateMembership);


router.get('/:id/export', checkAuth, checkOwnership, ctrl.exportAnggotaCsv);

module.exports = router;
