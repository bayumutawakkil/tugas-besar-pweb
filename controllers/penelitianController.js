

'use strict';

const ExcelJS        = require('exceljs');
const PDFDocument    = require('pdfkit');
const penelitianRepo = require('../models/penelitianModel');






function parseTahun(val) {
  if (!val || val === '') return null;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Kirim notifikasi loopback via redirect dengan flash-like query-param.
 * Karena proyek belum menggunakan session/connect-flash, kita embed pesan
 * ke query-string agar view bisa menampilkan toast.
 *
 * @param {object} res      - Express response
 * @param {string} target   - URL tujuan redirect
 * @param {string} type     - 'success' | 'error'
 * @param {string} message  - Pesan notifikasi
 */
function redirectWithMessage(res, target, type, message) {
  const separator = target.includes('?') ? '&' : '?';
  const encoded = encodeURIComponent(message);
  return res.redirect(`${target}${separator}flash_type=${type}&flash_msg=${encoded}`);
}





const STATUS_VALID = ['draft', 'aktif', 'selesai', 'ditolak'];


function validatePenelitianBody(body) {
  const errors = [];
  const { judul, tahun_mulai, tahun_selesai, status } = body;

  if (!judul || judul.trim().length === 0) {
    errors.push('Judul penelitian wajib diisi.');
  } else if (judul.trim().length > 500) {
    errors.push('Judul penelitian maksimal 500 karakter.');
  }

  const tahunMulaiInt = parseTahun(tahun_mulai);
  if (!tahunMulaiInt) {
    errors.push('Tahun mulai wajib diisi.');
  } else {
    const currentYear = new Date().getFullYear();
    if (tahunMulaiInt < 2000 || tahunMulaiInt > currentYear + 5) {
      errors.push(`Tahun mulai tidak valid (2000 – ${currentYear + 5}).`);
    }
  }

  const tahunSelesaiInt = parseTahun(tahun_selesai);
  if (tahunSelesaiInt !== null && tahunMulaiInt !== null) {
    if (tahunSelesaiInt < tahunMulaiInt) {
      errors.push('Tahun selesai tidak boleh lebih awal dari tahun mulai.');
    }
  }

  if (status && !STATUS_VALID.includes(status)) {
    errors.push('Nilai status tidak valid.');
  }

  return errors;
}






async function showDashboard(req, res) {
  try {
    const flashType = req.query.flash_type || null;
    const flashMsg  = req.query.flash_msg  ? decodeURIComponent(req.query.flash_msg) : null;

    const penelitianList = await penelitianRepo.getAllPenelitian();
    const stats = await penelitianRepo.getPenelitianStats();

    return res.render('penelitian/dashboard', {
      user: req.user,
      penelitianList,
      stats,
      flashType,
      flashMsg,
    });
  } catch (err) {
    console.error('[Controller] showDashboard error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat daftar penelitian.' });
  }
}






async function showMyPenelitian(req, res) {
  try {
    const flashType = req.query.flash_type || null;
    const flashMsg  = req.query.flash_msg  ? decodeURIComponent(req.query.flash_msg) : null;

    const penelitianList = await penelitianRepo.getPenelitianByDosenId(req.user.id);
    const pendingInvites = await penelitianRepo.getPendingInvitations(req.user.id);
    const activePenelitianList = penelitianList.filter((p) => p.my_status !== 'pending');

    return res.render('penelitian/my-penelitian', {
      user: req.user,
      penelitianList: activePenelitianList,
      pendingInvites,
      flashType,
      flashMsg,
    });
  } catch (err) {
    console.error('[Controller] showMyPenelitian error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat data penelitian Anda.' });
  }
}


async function showInvitations(req, res) {
  try {
    const flashType = req.query.flash_type || null;
    const flashMsg  = req.query.flash_msg  ? decodeURIComponent(req.query.flash_msg) : null;

    const pendingInvites = await penelitianRepo.getPendingInvitations(req.user.id);

    return res.render('penelitian/invitations', {
      user: req.user,
      pendingInvites,
      flashType,
      flashMsg,
    });
  } catch (err) {
    console.error('[Controller] showInvitations error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat undangan penelitian.' });
  }
}






async function showCreateForm(req, res) {
  return res.render('penelitian/create', {
    user:   req.user,
    errors: [],
    old:    {},
  });
}


async function handleCreate(req, res) {
  const errors = validatePenelitianBody(req.body);

  if (errors.length > 0) {
    return res.render('penelitian/create', {
      user:   req.user,
      errors,
      old:    req.body,
    });
  }

  try {
    const data = {
      judul:         req.body.judul.trim(),
      deskripsi:     req.body.deskripsi ? req.body.deskripsi.trim() : null,
      tahun_mulai:   parseTahun(req.body.tahun_mulai),
      tahun_selesai: parseTahun(req.body.tahun_selesai),
      status:        req.body.status || 'draft',
      ketua_id:      req.user.id,
    };

    const penelitianId = await penelitianRepo.createPenelitian(data);

    return redirectWithMessage(
      res,
      `/penelitian/${penelitianId}`,
      'success',
      'Penelitian berhasil ditambahkan!'
    );
  } catch (err) {
    console.error('[Controller] handleCreate error:', err);
    return res.render('penelitian/create', {
      user:   req.user,
      errors: ['Gagal menyimpan penelitian: ' + err.message],
      old:    req.body,
    });
  }
}






async function showDetail(req, res) {
  try {
    const flashType = req.query.flash_type || null;
    const flashMsg  = req.query.flash_msg  ? decodeURIComponent(req.query.flash_msg) : null;

    const penelitian  = await penelitianRepo.getPenelitianById(req.params.id);
    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    const anggotaList = await penelitianRepo.getAnggotaPenelitian(req.params.id);
    const isKetua     = Number(penelitian.ketua_id) === Number(req.user.id);
    const isAdmin     = req.user.role === 'admin';
    const currentMembership = anggotaList.find(a => Number(a.dosen_id) === Number(req.user.id));

    return res.render('penelitian/detail', {
      user: req.user,
      penelitian,
      anggotaList,
      isKetua,
      isAdmin,
      currentMembership,
      flashType,
      flashMsg,
    });
  } catch (err) {
    console.error('[Controller] showDetail error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat detail penelitian.' });
  }
}






async function showEditForm(req, res) {
  try {
    const penelitian = req.penelitian || await penelitianRepo.getPenelitianById(req.params.id);
    if (!penelitian) {
      return res.status(404).render('error', { message: 'Penelitian tidak ditemukan.' });
    }

    return res.render('penelitian/edit', {
      user:      req.user,
      penelitian,
      errors:    [],
    });
  } catch (err) {
    console.error('[Controller] showEditForm error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat form edit.' });
  }
}


async function handleUpdate(req, res) {
  const errors = validatePenelitianBody(req.body);
  const penelitianId = req.params.id;

  if (errors.length > 0) {
    const penelitian = req.penelitian || await penelitianRepo.getPenelitianById(penelitianId);
    
    const merged = { ...penelitian, ...req.body };
    return res.render('penelitian/edit', {
      user:      req.user,
      penelitian: merged,
      errors,
    });
  }

  try {
    const data = {
      judul:         req.body.judul.trim(),
      deskripsi:     req.body.deskripsi ? req.body.deskripsi.trim() : null,
      tahun_mulai:   parseTahun(req.body.tahun_mulai),
      tahun_selesai: parseTahun(req.body.tahun_selesai),
      status:        req.body.status,
    };

    const success = await penelitianRepo.updatePenelitian(penelitianId, data);
    if (!success) throw new Error('Tidak ada baris yang diperbarui.');

    return redirectWithMessage(
      res,
      `/penelitian/${penelitianId}`,
      'success',
      'Data penelitian berhasil diperbarui!'
    );
  } catch (err) {
    console.error('[Controller] handleUpdate error:', err);
    const penelitian = await penelitianRepo.getPenelitianById(penelitianId);
    return res.render('penelitian/edit', {
      user:      req.user,
      penelitian: { ...penelitian, ...req.body },
      errors:    ['Gagal memperbarui penelitian: ' + err.message],
    });
  }
}






async function handleDelete(req, res) {
  try {
    const penelitianId = req.params.id;
    const success = await penelitianRepo.deletePenelitian(penelitianId);

    if (!success) throw new Error('Tidak ada baris yang dihapus.');

    return redirectWithMessage(
      res,
      '/penelitian/my-penelitian',
      'success',
      'Penelitian berhasil dihapus.'
    );
  } catch (err) {
    console.error('[Controller] handleDelete error:', err);
    return redirectWithMessage(
      res,
      `/penelitian/${req.params.id}`,
      'error',
      'Gagal menghapus penelitian: ' + err.message
    );
  }
}






async function handleSearch(req, res) {
  try {
    const keyword = (req.query.q || '').trim();
    const scope   = req.query.scope || 'all';

    if (!keyword) {
      return res.redirect('/penelitian/dashboard');
    }

    const dosenId      = scope === 'mine' ? req.user.id : null;
    const penelitianList = await penelitianRepo.searchPenelitian(keyword, dosenId);

    return res.render('penelitian/search-results', {
      user: req.user,
      penelitianList,
      keyword,
      scope,
    });
  } catch (err) {
    console.error('[Controller] handleSearch error:', err);
    return res.status(500).render('error', { message: 'Gagal melakukan pencarian.' });
  }
}






async function showImportForm(req, res) {
  return res.render('penelitian/import', {
    user:   req.user,
    errors: [],
    result: null,
  });
}


async function handleImport(req, res) {
  
  if (!req.file) {
    return res.render('penelitian/import', {
      user:   req.user,
      errors: ['Tidak ada file yang diunggah.'],
      result: null,
    });
  }

  
  const allowedMime = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel', 
  ];
  if (!allowedMime.includes(req.file.mimetype)) {
    return res.render('penelitian/import', {
      user:   req.user,
      errors: ['Format file tidak valid. Harap unggah file Excel (.xlsx / .xls).'],
      result: null,
    });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.render('penelitian/import', {
        user:   req.user,
        errors: ['File Excel kosong atau tidak memiliki sheet.'],
        result: null,
      });
    }

    
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; 
      rows.push({ rowNumber, values: row.values }); 
    });

    if (rows.length === 0) {
      return res.render('penelitian/import', {
        user:   req.user,
        errors: ['Tidak ada data di file Excel (hanya header).'],
        result: null,
      });
    }

    
    const validRows   = [];
    const errorRows   = [];

    for (const { rowNumber, values } of rows) {
      
      const judul        = values[1] ? String(values[1]).trim() : '';
      const deskripsi    = values[2] ? String(values[2]).trim() : null;
      const tahun_mulai  = parseTahun(values[3]);
      const tahun_selesai = parseTahun(values[4]);
      const status       = values[5] ? String(values[5]).trim().toLowerCase() : 'draft';

      const rowErrors = [];

      if (!judul) rowErrors.push('Judul kosong');
      if (judul.length > 500) rowErrors.push('Judul > 500 karakter');
      if (!tahun_mulai) rowErrors.push('Tahun mulai tidak valid');

      const currentYear = new Date().getFullYear();
      if (tahun_mulai && (tahun_mulai < 2000 || tahun_mulai > currentYear + 5)) {
        rowErrors.push(`Tahun mulai tidak valid (2000–${currentYear + 5})`);
      }
      if (tahun_selesai && tahun_mulai && tahun_selesai < tahun_mulai) {
        rowErrors.push('Tahun selesai < tahun mulai');
      }
      if (!STATUS_VALID.includes(status)) {
        rowErrors.push(`Status "${status}" tidak valid (draft/aktif/selesai/ditolak)`);
      }

      if (rowErrors.length > 0) {
        errorRows.push({ rowNumber, errors: rowErrors });
      } else {
        validRows.push({ judul, deskripsi, tahun_mulai, tahun_selesai, status });
      }
    }

    
    let insertedCount = 0;

    for (const row of validRows) {
      await penelitianRepo.createPenelitian({
        ...row,
        ketua_id: req.user.id,
      });
      insertedCount++;
    }

    return res.render('penelitian/import', {
      user:   req.user,
      errors: [],
      result: {
        total:    rows.length,
        inserted: insertedCount,
        skipped:  errorRows.length,
        errorRows,
      },
    });
  } catch (err) {
    console.error('[Controller] handleImport error:', err);
    return res.render('penelitian/import', {
      user:   req.user,
      errors: ['Gagal memproses file: ' + err.message],
      result: null,
    });
  }
}






async function exportExcel(req, res) {
  try {
    const dosenId = req.user.role === 'admin' ? null : req.user.id;
    const penelitianList = dosenId
      ? await penelitianRepo.getPenelitianByDosenId(dosenId)
      : await penelitianRepo.getAllPenelitian();

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Penelitian FTI';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Data Penelitian');

    
    sheet.columns = [
      { header: 'No',            key: 'no',            width: 5  },
      { header: 'Judul',         key: 'judul',         width: 50 },
      { header: 'Ketua',         key: 'ketua',         width: 25 },
      { header: 'Tahun Mulai',   key: 'tahun_mulai',   width: 12 },
      { header: 'Tahun Selesai', key: 'tahun_selesai', width: 14 },
      { header: 'Status',        key: 'status',        width: 12 },
      { header: 'Deskripsi',     key: 'deskripsi',     width: 60 },
    ];

    
    sheet.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' },
      };
    });

    
    penelitianList.forEach((p, index) => {
      const row = sheet.addRow({
        no:            index + 1,
        judul:         p.judul,
        ketua:         p.ketua_name || '-',
        tahun_mulai:   p.tahun_mulai,
        tahun_selesai: p.tahun_selesai || '-',
        status:        p.status,
        deskripsi:     p.deskripsi || '-',
      });

      
      if (index % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
        });
      }

      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    });

    sheet.getRow(1).height = 22;

    
    const filename = `penelitian_${Date.now()}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[Controller] exportExcel error:', err);
    return res.status(500).json({ error: 'Gagal mengekspor data ke Excel.' });
  }
}


async function exportPdf(req, res) {
  try {
    const dosenId = req.user.role === 'admin' ? null : req.user.id;
    const penelitianList = dosenId
      ? await penelitianRepo.getPenelitianByDosenId(dosenId)
      : await penelitianRepo.getAllPenelitian();

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    const filename = `penelitian_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Data Penelitian – Sistem Informasi FTI', { align: 'center' });
    doc.fontSize(10).font('Helvetica')
       .text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
    doc.moveDown(1);

    
    const colWidths = [25, 200, 110, 65, 70, 65, 60]; 
    const headers   = ['No', 'Judul', 'Ketua', 'Thn Mulai', 'Thn Selesai', 'Status', 'Total Anggota'];
    const rowHeight = 18;
    const startX    = doc.page.margins.left;
    let   y         = doc.y;

    
    function drawRow(cells, isHeader = false) {
      
      if (isHeader) {
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fill('#2563EB');
      }

      let x = startX;
      cells.forEach((text, i) => {
        const w = colWidths[i];

        
        doc.rect(x, y, w, rowHeight).stroke('#CBD5E1');

        
        doc.fillColor(isHeader ? '#FFFFFF' : '#1E293B')
           .fontSize(isHeader ? 8 : 7.5)
           .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
           .text(String(text || '-'), x + 3, y + 5, {
             width:    w - 6,
             height:   rowHeight - 4,
             ellipsis: true,
             lineBreak: false,
           });

        x += w;
      });

      y += rowHeight;

      
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight * 2) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    drawRow(headers, true);

    penelitianList.forEach((p, idx) => {
      const cells = [
        String(idx + 1),
        p.judul,
        p.ketua_name || '-',
        String(p.tahun_mulai),
        String(p.tahun_selesai || '-'),
        p.status,
        String(p.total_anggota || 0),
      ];
      drawRow(cells, false);
    });

    doc.moveDown(1);
    doc.fillColor('#64748B').fontSize(8)
       .text(`Total data: ${penelitianList.length}`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error('[Controller] exportPdf error:', err);
    
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Gagal mengekspor data ke PDF.' });
    }
  }
}



async function showManageAnggota(req, res) {
  try {
    const penelitianId   = req.params.id;
    const penelitian     = req.penelitian || await penelitianRepo.getPenelitianById(penelitianId);
    const anggotaList    = await penelitianRepo.getAnggotaPenelitian(penelitianId);
    const availableDosen = await penelitianRepo.getAvailableDosen(penelitianId);

    return res.render('penelitian/manage-anggota', {
      user: req.user, penelitian, anggotaList, availableDosen,
      errors: [], flashType: null, flashMsg: null,
    });
  } catch (err) {
    console.error('[Controller] showManageAnggota error:', err);
    return res.status(500).render('error', { message: 'Gagal memuat halaman kelola anggota.' });
  }
}

async function handleAddAnggota(req, res) {
  const penelitianId = req.params.id;
  try {
    const dosenId = req.body.dosen_id;
    if (!dosenId) throw new Error('Dosen harus dipilih.');
    await penelitianRepo.addAnggotaPenelitian(penelitianId, dosenId);
    return res.redirect(`/penelitian/${penelitianId}/anggota`);
  } catch (err) {
    const penelitian     = await penelitianRepo.getPenelitianById(penelitianId);
    const anggotaList    = await penelitianRepo.getAnggotaPenelitian(penelitianId);
    const availableDosen = await penelitianRepo.getAvailableDosen(penelitianId);
    return res.render('penelitian/manage-anggota', {
      user: req.user, penelitian, anggotaList, availableDosen,
      errors: [err.message], flashType: null, flashMsg: null,
    });
  }
}

async function handleRemoveAnggota(req, res) {
  try {
    const dosenId = req.body.dosen_id;
    if (!dosenId) throw new Error('Dosen ID tidak valid.');
    await penelitianRepo.removeAnggotaPenelitian(req.params.id, dosenId);
    return res.redirect(`/penelitian/${req.params.id}/anggota`);
  } catch (err) {
    console.error('[Controller] handleRemoveAnggota error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleUpdateMembership(req, res) {
  try {
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) {
      return redirectWithMessage(
        res,
        `/penelitian/${req.params.id}`,
        'error',
        'Status undangan tidak valid.'
      );
    }

    const success = await penelitianRepo.updateStatusAnggota(req.params.id, req.user.id, status);
    if (!success) {
      return redirectWithMessage(
        res,
        '/penelitian/undangan',
        'error',
        'Undangan tidak ditemukan atau sudah diproses.'
      );
    }

    const target = status === 'approved' ? `/penelitian/${req.params.id}` : '/penelitian/undangan';
    const message = status === 'approved'
      ? 'Undangan diterima. Anda sekarang menjadi anggota penelitian.'
      : 'Undangan penelitian ditolak.';

    return redirectWithMessage(res, target, 'success', message);
  } catch (err) {
    console.error('[Controller] handleUpdateMembership error:', err);
    return redirectWithMessage(
      res,
      '/penelitian/undangan',
      'error',
      'Gagal memproses undangan: ' + err.message
    );
  }
}

async function exportAnggotaCsv(req, res) {
  try {
    const penelitianId = req.params.id;
    const anggotaList  = await penelitianRepo.getAnggotaPenelitian(penelitianId);

    let csv = 'No,Nama Dosen,Email,Role,Status\n';
    anggotaList.forEach((a, idx) => {
      csv += `${idx + 1},"${a.dosen_name}","${a.dosen_email}","${a.role}","${a.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="penelitian_${penelitianId}_anggota.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('[Controller] exportAnggotaCsv error:', err);
    return res.status(500).json({ error: err.message });
  }
}



module.exports = {
  showDashboard,
  showMyPenelitian,
  showInvitations,
  showCreateForm,
  handleCreate,
  showDetail,
  showEditForm,
  handleUpdate,
  handleDelete,
  handleSearch,
  showImportForm,
  handleImport,
  exportExcel,
  exportPdf,
  showManageAnggota,
  handleAddAnggota,
  handleRemoveAnggota,
  handleUpdateMembership,
  exportAnggotaCsv,
};
