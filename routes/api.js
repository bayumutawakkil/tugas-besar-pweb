'use strict';

const express = require('express');
const router  = express.Router();
const penelitianRepo = require('../models/penelitianModel');

// Endpoint API untuk mendapatkan semua data penelitian
router.get('/penelitian', async (req, res) => {
  try {
    const penelitianList = await penelitianRepo.getAllPenelitian();
    
    return res.status(200).json({
      status: 'success',
      message: 'Berhasil mengambil data penelitian',
      data: penelitianList
    });
  } catch (err) {
    console.error('[API] Error get penelitian:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Endpoint API sederhana untuk cek status server
router.get('/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running smoothly'
  });
});

module.exports = router;
