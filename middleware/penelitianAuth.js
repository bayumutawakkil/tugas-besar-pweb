


function preventIdManipulation(req, res, next) {
  const penelitianIdParam = req.params.id;
  const penelitianIdBody = req.body.penelitian_id;
  
  
  if (penelitianIdParam && penelitianIdBody) {
    if (penelitianIdParam !== penelitianIdBody) {
      return res.status(400).json({ 
        error: 'ID penelitian tidak valid. Kemungkinan ada manipulasi data.' 
      });
    }
  }
  
  
  if (req.body.ketua_id && req.method !== 'POST') {
    delete req.body.ketua_id;
  }
  
  next();
}


function validatePenelitianData(req, res, next) {
  const { judul, tahun_mulai } = req.body;
  
  if (!judul || judul.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Judul penelitian harus diisi' 
    });
  }
  
  if (!tahun_mulai) {
    return res.status(400).json({ 
      error: 'Tahun mulai penelitian harus diisi' 
    });
  }
  
  const tahunMulai = parseInt(tahun_mulai);
  const currentYear = new Date().getFullYear();
  
  if (tahunMulai < 2000 || tahunMulai > currentYear + 5) {
    return res.status(400).json({ 
      error: 'Tahun mulai tidak valid' 
    });
  }
  
  
  if (req.body.tahun_selesai) {
    const tahunSelesai = parseInt(req.body.tahun_selesai);
    
    if (tahunSelesai < tahunMulai) {
      return res.status(400).json({ 
        error: 'Tahun selesai tidak boleh lebih kecil dari tahun mulai' 
      });
    }
  }
  
  next();
}

module.exports = {
  preventIdManipulation,
  validatePenelitianData
};
