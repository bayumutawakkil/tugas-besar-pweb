'use strict';

const express = require('express');
const router  = express.Router();
const { checkAuth } = require('../middleware/auth');
const ctrl          = require('../controllers/authController');


router.get ('/register', ctrl.showRegister);
router.post('/register', ctrl.handleRegister);

router.get ('/login',  ctrl.showLogin);
router.post('/login',  ctrl.handleLogin);
router.get ('/logout', ctrl.handleLogout);


router.get ('/dashboard',    checkAuth, ctrl.showDashboard);
router.get ('/pagenotfound', checkAuth, ctrl.showPageNotFound);

router.get ('/profile', checkAuth, ctrl.showProfile);
router.post('/profile', checkAuth, ctrl.handleProfile);


router.get('/users',        checkAuth, ctrl.showUsers);
router.get('/users/search', checkAuth, ctrl.searchUsers);
router.get('/users/:id',    checkAuth, ctrl.showUserDetail);

router.post('/users/:id/edit',   checkAuth, ctrl.handleEditUser);
router.post('/users/:id/role',   checkAuth, ctrl.handleUpdateRole);
router.post('/users/:id/status', checkAuth, ctrl.handleUpdateStatus);
router.post('/users/:id/delete', checkAuth, ctrl.handleDeleteUser);

module.exports = router;