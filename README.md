# Tugas Besar Pemrograman Web

## Deskripsi Umum

Proyek ini adalah tugas besar mata kuliah Pemrograman Web yang mengharuskan mahasiswa membangun sebuah aplikasi web berbasis arsitektur client-server menggunakan teknologi yang telah dipelajari selama perkuliahan. Proyek ini dikerjakan secara berkelompok untuk mensimulasikan proses pengembangan perangkat lunak secara kolaboratif.

Aplikasi yang dikembangkan harus mencerminkan praktik dasar pengembangan web modern, meliputi pengelolaan data, autentikasi pengguna, serta antarmuka pengguna yang terstruktur.

### Modul Aplikasi: FTI Penelitian dan Pengabdian

Modul ini berfokus pada pengelolaan data penelitian oleh dosen, termasuk:
- Pengelolaan data penelitian (CRUD + SIE)
- Pengelolaan anggota penelitian
- Persetujuan keanggotaan penelitian oleh anggota dosen

---

## Spesifikasi Teknologi

Setiap kelompok wajib menggunakan stack berikut:

| Komponen | Teknologi |
|----------|-----------|
| **Backend** | ExpressJS (Node.js) |
| **Database** | MySQL atau MariaDB |
| **Frontend UI** | Bootstrap UI (untuk layout dan styling) |
| **Version Control** | Git (repository di GitHub) |

### Persyaratan Tambahan:
- ✅ Tidak diizinkan menggunakan ORM seperti Sequelize atau PrismaORM
- ✅ Wajib menggunakan library native database `mysql2`
- ✅ Hanya ExpressJS yang diizinkan sebagai framework backend
- ✅ Perubahan database harus seizin dosen pengampu

---

## Ketentuan Umum

1. Proyek dapat dikerjakan secara individual atau berkelompok (tergantung kompleksitas)
2. Setiap anggota harus memiliki kontribusi yang jelas (dibuktikan melalui commit Git)
3. Larangan penggunaan framework selain ExpressJS
4. Database harus menggunakan native MySQL dengan library `mysql2`
5. Struktur project harus rapi dan terorganisir dengan baik

---

## Timeline Project

| Minggu | Aktivitas | Deliverables |
|--------|-----------|--------------|
| #9 | Pembentukan Kelompok & Distribusi Tugas | BPMN Project / Diagram Alur Aplikasi, Kebutuhan Fungsional (Fitur Sistem) |
| #10 | Praktikum Project NodeJS (ExpressJS) | Sesuai instruksi praktikum |
| #11 | Implementasi: Modul Autentikasi, ACL, Middleware, Struktur Database | Repository GitHub, Implementasi Autentikasi & ACL, Laporan Progress |
| #12 | Implementasi: Form Handling, Validasi Data, Upload File, REST API, Export Data | Repository GitHub (Fork), Laporan Progress |
| #13 | Lanjutan Implementasi Fitur Utama | Laporan Progress, Repository GitHub (Finish) |
| #14 | Feature Testing dengan Playwright | Test Suite, Laporan Progress, Proyek Selesai (soft requirement) |
| #15 | Project Deployment | Laporan Deployment, Alamat Web |
| #16 | UAS - Presentasi Project | Presentasi, Ujian Lisan, Video Demo (Max 10 menit), Pull Request ke Main Repo |

---

## Fitur Aplikasi

### Fitur Wajib (Setiap Kelompok)
- Autentikasi pengguna
- Access Control List (ACL)
- Pengelolaan data dengan validasi form
- Upload file
- REST API endpoints
- Export data

### Fitur Tambahan Per Anggota
Setiap anggota harus menambahkan minimal satu fitur yang:
- Memberikan response API yang tepat
- Menggenerate/print file dalam format PDF/DOCX/image (sesuaikan kebutuhan)

### Fitur Spesifik Modul: FTI Penelitian dan Pengabdian

#### Untuk Dosen:
- ✅ CRUD Penelitian (Create, Read, Update, Delete) + Search, Import, Export (SIE)
- ✅ Kelola anggota penelitian
- ✅ Approve/reject pendaftaran anggota penelitian

#### Untuk Dosen Anggota:
- ✅ Approve/reject keanggotaan penelitian

---

## Instalasi dan Menjalankan Aplikasi

### Prasyarat
- Node.js (v14 atau lebih tinggi)
- MySQL atau MariaDB server
- Git

### Langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone <url-repository>
   cd tugas-besar-pweb
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Database**
   - Buat file `.env` di root directory:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pweb_ftirda
   DB_PORT=3306
   
   PORT=3000
   NODE_ENV=development
   ```
   - Import skema database (hubungi dosen untuk file SQL)

4. **Jalankan Aplikasi**
   ```bash
   npm start
   ```
   Aplikasi akan berjalan di `http://localhost:3000`

5. **Mode Development (dengan auto-reload)**
   ```bash
   npm run dev
   ```

---

## Struktur Project

```
tugas-besar-pweb/
├── src/
│   ├── config/          # Konfigurasi database & env
│   ├── controllers/     # Business logic
│   ├── middleware/      # Middleware autentikasi & ACL
│   ├── routes/          # Route definitions
│   ├── models/          # Database queries
│   ├── views/           # Template HTML
│   ├── public/          # Static files (CSS, JS, images)
│   └── utils/           # Helper functions
├── tests/               # Test files (Playwright)
├── .env                 # Environment variables
├── .env.example         # Template environment variables
├── app.js               # Entry point
├── package.json         # Dependencies
└── README.md            # Dokumentasi
```

---

## Pembagian Tugas Anggota Kelompok

| No | Nama Anggota | Modul/Fitur | Status |
|-----|---|---|---|
| 1 | [Bayu MUtawakkil] | [Modul 1] | [Aktif] |
| 2 | [Tata Haryadi Jayamahe] | [Modul 2, 3] | [Aktif] |




---

## Deliverables (Wajib Dikumpulkan)

### 1. Source Code (GitHub)
- ✅ Repository bersifat publik atau dapat diakses (minimal sampai penilaian)
- ✅ Struktur project rapi dan terorganisir
- ✅ Setiap anggota memiliki kontribusi yang jelas di commit history

### 2. README Komprehensif Berisi:
- ✅ Deskripsi aplikasi
- ✅ Cara instalasi dan menjalankan aplikasi
- ✅ Pembagian tugas anggota
- ✅ Struktur project

### 3. Video Demo (5–10 menit)
- ✅ Penjelasan fitur utama
- ✅ Demonstrasi penggunaan aplikasi
- ✅ Penjelasan singkat arsitektur sistem

### 4. Testing & Deployment
- ✅ Test Suite menggunakan Playwright (Minggu #14)
- ✅ Project Deployment (Minggu #15)
- ✅ Laporan Deployment dengan alamat web

### 5. Dokumentasi Tambahan
- ✅ BPMN/Diagram alur aplikasi
- ✅ Laporan progress per minggu
- ✅ Dokumentasi API endpoints
- ✅ ERD database

---

## Panduan Kontribusi Git

Setiap anggota kelompok harus memastikan kontribusi mereka tercatat dengan baik:

```bash
# Setup Git config
git config user.name "Nama Anda"
git config user.email "email@domain.com"

# Buat branch untuk fitur Anda
git checkout -b feature/nama-fitur

# Commit dengan pesan yang jelas
git commit -m "feat(modul): deskripsi perubahan"

# Push ke repository
git push origin feature/nama-fitur

# Buat Pull Request ke branch main
```

---

## Catatan Penting

⚠️ **Poin Penting:**
- Pastikan **setiap anggota memiliki kontribusi** (dibuktikan commit Git)
- **Tidak boleh menggunakan ORM** - gunakan `mysql2` native driver
- **Database harus sesuai persetujuan dosen** - hubungi pengampu untuk perubahan
- Gunakan **HTTPS URL untuk clone** jika private key belum dikonfigurasi
- Dokumentasi yang lengkap akan meningkatkan nilai proyek

---

## Kontak & Referensi

- **Dosen Pengampu:** [Nama Dosen]
- **Link ERD Database:** T.B.A
- **Link SQL Database:** T.B.A
- **Repository:** [URL Repository]

---

**Terakhir diupdate:** May 2026