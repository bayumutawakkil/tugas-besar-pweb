'use strict';

function preventIdManipulation(req, res, next) {
  const paramId = req.params.id;
  const bodyId  = req.body.penelitian_id;

  if (paramId && bodyId && paramId !== bodyId) {
    return res.status(400).json({
      error: 'ID penelitian tidak valid. Kemungkinan ada manipulasi data.',
    });
  }

  
  if (req.body.ketua_id && req.method !== 'POST') {
    delete req.body.ketua_id;
  }

  next();
}

function validatePenelitianData(req, res, next) {
  const { judul, tahun_mulai, tahun_selesai } = req.body;
  const currentYear = new Date().getFullYear();

  if (!judul || judul.trim().length === 0) {
    return res.status(400).json({ error: 'Judul penelitian harus diisi.' });
  }

  if (judul.trim().length > 500) {
    return res.status(400).json({ error: 'Judul penelitian maksimal 500 karakter.' });
  }

  const tahunMulai = parseInt(tahun_mulai, 10);
  if (!tahun_mulai || Number.isNaN(tahunMulai)) {
    return res.status(400).json({ error: 'Tahun mulai penelitian harus diisi.' });
  }

  if (tahunMulai < 2000 || tahunMulai > currentYear + 5) {
    return res.status(400).json({ error: `Tahun mulai tidak valid (2000–${currentYear + 5}).` });
  }

  if (tahun_selesai) {
    const tahunSelesai = parseInt(tahun_selesai, 10);
    if (!Number.isNaN(tahunSelesai) && tahunSelesai < tahunMulai) {
      return res.status(400).json({ error: 'Tahun selesai tidak boleh lebih kecil dari tahun mulai.' });
    }
  }

  next();
}

module.exports = { preventIdManipulation, validatePenelitianData };
