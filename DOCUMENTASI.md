# PAYROLLIN — Dokumentasi Proyek

Platform HR mobile-first untuk absensi karyawan, riwayat kehadiran, reimbursement, dan pengajuan izin. Backend **Next.js API Routes** + database **PostgreSQL** (deploy via **Railway**).

**Repository:** https://github.com/yomari221010-commits/absensi

---

## Setup Cepat — Railway + PostgreSQL

1. Buat project di [Railway](https://railway.app) → **Add PostgreSQL**
2. Copy `DATABASE_URL` dari tab Variables
3. Buat file `.env.local`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=string-rahasa-panjang-minimal-32-karakter
OFFICE_LATITUDE=-6.2906958
OFFICE_LONGITUDE=106.8095851
OFFICE_RADIUS_METERS=100
```

4. Jalankan app & migrasi:

```bash
npm install
npm run dev
# terminal lain:
npm run db:migrate
```

5. Login demo:
   - **Karyawan:** `budi@payrollin.id` / `employee123`
   - **Admin:** `admin@payrollin.id` / `admin123`

---

## Daftar Isi

1. [Ringkasan Fitur](#ringkasan-fitur)
2. [Tech Stack](#tech-stack)
3. [Persyaratan Sistem](#persyaratan-sistem)
4. [Instalasi & Menjalankan](#instalasi--menjalankan)
5. [Struktur Folder](#struktur-folder)
6. [Alur Aplikasi](#alur-aplikasi)
7. [Modul Absensi](#modul-absensi)
8. [Database PostgreSQL](#database-postgresql)
9. [API Reference](#api-reference)
10. [Peta & GPS](#peta--gps)
11. [Ekspor Excel](#ekspor-excel)
12. [Konfigurasi Next.js](#konfigurasi-nextjs)
13. [Git & Deployment](#git--deployment)
14. [Troubleshooting](#troubleshooting)

---

## Ringkasan Fitur

| Modul | Deskripsi | Status Data |
|-------|-----------|-------------|
| **Login** | Email + password, JWT, redirect by role | PostgreSQL + JWT |
| **Home** | Dashboard ringkasan, jam real-time, riwayat terbaru | API + PostgreSQL |
| **Absensi** | GPS + peta, absen masuk/keluar via kamera | PostgreSQL |
| **Riwayat** | Filter harian/mingguan/bulanan/tahunan + ekspor Excel | PostgreSQL |
| **Izin (Leave)** | Pengajuan + approval admin | PostgreSQL |
| **Reimbursement** | Pengajuan + approval admin | PostgreSQL |
| **Profil** | Data user dari API | PostgreSQL |
| **Notifikasi** | Notifikasi sistem & approval | PostgreSQL |
| **Admin** | Dashboard statistik + CRUD karyawan | PostgreSQL |

### Fitur Absensi (Inti Aplikasi)

- **Absen Masuk** — foto dari kamera depan/belakang + koordinat GPS + alamat
- **Absen Keluar** — hanya tampil setelah absen masuk hari ini, belum checkout
- **Peta interaktif** — marker lokasi, lingkaran akurasi GPS, link ke Google Maps
- **Riwayat persisten** — tersimpan di SQLite, tidak hilang saat refresh
- **Ekspor Excel** — laporan rapi sesuai tab periode aktif (harian/mingguan/bulanan/tahunan)
- **Dark mode** — toggle tema gelap/terang di seluruh aplikasi

---

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 18, Tailwind CSS v4 |
| Ikon | Lucide React |
| Grafik | Recharts |
| Database | PostgreSQL (`pg`) — Railway |
| Auth | JWT (`jose`) + bcrypt |
| Peta | Leaflet (inisialisasi manual, tanpa react-leaflet MapContainer) |
| Geocoding | OpenStreetMap Nominatim |
| Ekspor | ExcelJS (dynamic import, client-side) |
| Komponen UI | Radix UI + shadcn-style components |

---

## Persyaratan Sistem

- **Node.js** 18 atau lebih baru
- **npm** (atau pnpm/yarn)
- Browser modern (Chrome, Edge, Firefox, Safari)
- **HTTPS atau `localhost`** — wajib untuk akses kamera & GPS
- Izin **kamera** dan **lokasi** di browser/perangkat

---

## Instalasi & Menjalankan

```bash
# Clone repository
git clone https://github.com/yomari221010-commits/absensi.git
cd absensi

# Install dependensi
npm install

# Jalankan development server
npm run dev
```

Buka **http://localhost:3000** di browser.

### Scripts NPM

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Build production |
| `npm run start` | Jalankan build production |
| `npm run lint` | Pemeriksaan kode ESLint |

### Build Production

```bash
npm run build
npm run start
```

---

## Struktur Folder

```
ABSENSI/
├── data/                          # Database SQLite (auto-created, di .gitignore)
│   └── payrollin.db
├── src/
│   ├── app/
│   │   ├── api/attendance/        # REST API absensi
│   │   │   └── route.ts
│   │   ├── globals.css            # Style global + Leaflet overrides
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Entry point → PayrollInApp
│   ├── components/
│   │   ├── PayrollInApp.tsx       # Komponen utama (semua layar)
│   │   ├── AttendanceCamera.tsx   # Kamera absensi
│   │   ├── LocationMap.tsx        # Peta Leaflet
│   │   ├── LocationMapLoader.tsx  # Dynamic import peta (ssr: false)
│   │   ├── LoginHeroVisual.tsx    # Ilustrasi halaman login
│   │   ├── figma/                 # Helper komponen
│   │   └── ui/                    # Komponen UI (shadcn)
│   ├── lib/
│   │   ├── db.ts                  # Koneksi & skema SQLite
│   │   ├── attendance-db.ts       # CRUD absensi
│   │   ├── attendance-api.ts      # Client fetch helpers
│   │   ├── attendance-types.ts    # Tipe & helper format
│   │   ├── attendance-period.ts   # Filter periode riwayat
│   │   ├── export-attendance-excel.ts  # Generator file Excel
│   │   └── geolocation.ts         # GPS + reverse geocode
│   └── styles/                    # CSS tema, font, tailwind
├── next.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── DOCUMENTASI.md                 # File ini
```

---

## Alur Aplikasi

```
Splash (2.6 detik)
    ↓
Login
    ↓
Home ←→ Bottom Navigation
    ├── Absensi → Kamera → Simpan → Home (notifikasi sukses)
    ├── Izin (Leave)
    ├── Reimbursement
    └── Profil

Home / Absensi / Riwayat
    └── Riwayat Absensi (dari tab Home atau navigasi)
```

### Navigasi Bottom Bar

| Tab | Screen ID | Fungsi |
|-----|-----------|--------|
| Home | `home` | Dashboard |
| Absensi | `attendance` | Lokasi + tombol absen |
| Izin | `leave` | Manajemen cuti |
| Reimburse | `reimbursement` | Klaim biaya |
| Profil | `profile` | Data karyawan |

---

## Modul Absensi

### Logika Tombol

| Kondisi | Tombol yang Tampil |
|---------|-------------------|
| Belum absen masuk hari ini | **Absen Masuk** |
| Sudah masuk, belum keluar | **Absen Keluar** |
| Sudah masuk & keluar | Tidak ada tombol absen |

### Alur Absen Masuk / Keluar

1. User menekan **Absen Masuk** atau **Absen Keluar**
2. Layar kamera terbuka (`AttendanceCamera`)
3. Browser meminta izin kamera
4. User menekan tombol capture (lingkaran putih)
5. Aplikasi mengambil GPS + reverse geocode alamat
6. Foto (base64) + lokasi dikirim ke `POST /api/attendance`
7. Data disimpan ke SQLite
8. User diarahkan ke Home dengan notifikasi hijau singkat (4 detik)

### Status Kehadiran

| Status | Keterangan |
|--------|------------|
| `hadir` | Check-in sebelum atau tepat pukul 09:00 |
| `telat` | Check-in setelah pukul 09:00 |
| `izin` | Izin (mock data) |
| `cuti` | Cuti (mock data) |
| `absent` | Tidak hadir |
| `wfh` | Work from home (mock data) |

### File Terkait

| File | Peran |
|------|-------|
| `src/components/PayrollInApp.tsx` | UI absensi, state, navigasi |
| `src/components/AttendanceCamera.tsx` | `getUserMedia`, capture frame ke canvas |
| `src/lib/geolocation.ts` | `getCurrentLocation()`, Nominatim |
| `src/lib/attendance-api.ts` | Fetch ke API dari client |
| `src/lib/attendance-db.ts` | Logika bisnis & query SQL |

---

## Database PostgreSQL

Migrasi otomatis via `src/lib/db/migrate.ts` saat API pertama kali dipanggil, atau manual: `POST /api/db/migrate`.

### Tabel Utama

| Tabel | Fungsi |
|-------|--------|
| `users` | Karyawan & admin (role, password bcrypt) |
| `departments` | Master departemen |
| `positions` | Master jabatan |
| `office_settings` | Koordinat kantor + radius validasi absensi |
| `attendance` | Absensi per user per hari |
| `leave_requests` | Pengajuan izin/sakit/cuti/WFH |
| `reimbursement` | Klaim reimbursement |
| `notifications` | Notifikasi per user |

### Validasi Absensi (Server)

- GPS accuracy ≤ **50 meter**
- Jarak ke kantor ≤ **100 meter** (dari `office_settings`)
- Check-in tidak boleh duplikat per hari
- Check-out wajib setelah check-in

---

## API Reference

Semua endpoint (kecuali login & migrate) memerlukan header:

```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/auth/login` | Login email + password |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/profile` | Profil user login |

### Attendance

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/attendance` | Riwayat (employee: sendiri, admin: semua) |
| GET | `/api/attendance/today` | Absensi hari ini + ringkasan |
| POST | `/api/attendance` | Check-in / check-out |

### Leave & Reimbursement

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET/POST | `/api/leave` | List / buat pengajuan |
| PATCH | `/api/leave/[id]` | Admin approve/reject |
| GET/POST | `/api/reimbursement` | List / buat klaim |
| PATCH | `/api/reimbursement/[id]` | Admin approve/reject |

### Admin & Lainnya

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/admin/dashboard` | Statistik admin |
| GET/POST | `/api/admin/users` | List / tambah karyawan |
| PATCH/DELETE | `/api/admin/users/[id]` | Update / hapus karyawan |
| GET/PATCH | `/api/notifications` | List / tandai semua dibaca |
| POST | `/api/db/migrate` | Inisialisasi tabel + seed |

### Contoh `POST /api/attendance`

Menyimpan absen masuk atau keluar.

**Request Body:**
```json
{
  "type": "masuk",
  "photo": "data:image/jpeg;base64,...",
  "latitude": -6.2906958,
  "longitude": 106.8095851,
  "accuracy": 12,
  "address": "Jl. Contoh, Jakarta Selatan, Indonesia"
}
```

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `type` | ✅ | `"masuk"` atau `"keluar"` |
| `photo` | ✅ | Base64 data URL dari kamera |
| `latitude` | ✅ | Derajat lintang |
| `longitude` | ✅ | Derajat bujur |
| `accuracy` | ❌ | Akurasi GPS (meter) |
| `address` | ✅ | Alamat lengkap dari geocoding |

**Response 200:**
```json
{
  "record": { "...": "..." }
}
```

**Response 400:** Validasi gagal atau aturan bisnis dilanggar.

---

## Peta & GPS

### Komponen Peta

- **`LocationMap.tsx`** — Leaflet diinisialisasi manual via `useEffect` (hindari masalah React Strict Mode)
- **`LocationMapLoader.tsx`** — `dynamic(..., { ssr: false })` agar tidak di-render di server

### Tile Layer

Menggunakan **CARTO Voyager** — peta terang dengan warna jalan dan label yang jelas:

```
https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
```

### Kontrol Zoom

- Tombol **+** / **−** diposisikan di **pojok kiri bawah**
- Badge **"Lokasi Terdeteksi"** di pojok kiri atas (tidak bentrok)
- Link **"Buka di Maps →"** di pojok kanan bawah → Google Maps

### GPS & Geocoding

| Langkah | Layanan |
|---------|---------|
| Koordinat | Browser Geolocation API |
| Alamat | OpenStreetMap Nominatim (bahasa Indonesia) |

---

## Ekspor Excel

### Lokasi Fitur

Halaman **Riwayat Absensi** → tombol **Export** di header (ikon download + teks).

### Periode Export

Export mengikuti **tab aktif**:

| Tab | Filter |
|-----|--------|
| Harian | Data hari ini saja |
| Mingguan | Senin–Minggu minggu berjalan |
| Bulanan | Bulan kalender berjalan |
| Tahunan | Tahun kalender berjalan |

### Isi File Excel

- Header branding **PAYROLLIN**
- Meta: periode, nama karyawan, email, departemen, tanggal ekspor
- Ringkasan: jumlah Hadir, Telat, Izin, Cuti, Tidak Hadir, WFH, rata-rata jam kerja
- Tabel: No, Tanggal, Masuk, Keluar, Durasi, Status (berwarna), Lokasi
- Auto-filter & header freeze

### Nama File

Contoh: `Absensi_mingguan_20260630.xlsx`

### Implementasi Teknis

- Library: **ExcelJS**
- Dimuat via **dynamic import** saat tombol Export diklik (tidak ikut bundle awal)
- File diunduh langsung di browser (Blob + anchor download)

### File Terkait

| File | Peran |
|------|-------|
| `src/lib/attendance-period.ts` | Logika filter periode |
| `src/lib/export-attendance-excel.ts` | Generator & styling Excel |

---

## Konfigurasi Next.js

File: `next.config.ts`

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "exceljs"],
};
```

| Opsi | Alasan |
|------|--------|
| `reactStrictMode` | Deteksi side-effect ganda di development |
| `serverExternalPackages` | `better-sqlite3` & `exceljs` tidak di-bundle ke server webpack |

---

## Git & Deployment

### Remote Repository

```
https://github.com/yomari221010-commits/absensi.git
```

### Konfigurasi Git (Per Project)

Jika muncul error *"configure your user.name and user.email"*:

```bash
git config user.name "yomari221010-commits"
git config user.email "yomari221010-commits@users.noreply.github.com"
```

### Push Perubahan

```bash
git add .
git commit -m "deskripsi perubahan"
git push origin main
```

### File yang Tidak Di-commit

| Path | Alasan |
|------|--------|
| `node_modules/` | Dependensi npm |
| `.next/` | Cache build Next.js |
| `data/` | Database SQLite lokal |
| `.env*.local` | Environment secrets |

---

## Troubleshooting

### Web tidak terbuka / Error 500

**Gejala:** `Cannot find module './331.js'` atau `prerender-manifest.json` tidak ditemukan.

**Penyebab:** Cache `.next` rusak (biasanya karena folder dihapus saat `npm run dev` masih berjalan).

**Solusi:**
```bash
# Hentikan dev server (Ctrl + C), lalu:
Remove-Item -Recurse -Force .next   # PowerShell
npm run dev
```

### Error exceljs / vendor-chunks

**Gejala:** `Cannot find module './vendor-chunks/exceljs.js'`

**Penyebab:** ExcelJS ter-bundle ke server.

**Solusi:** Sudah ditangani dengan dynamic import. Pastikan tidak ada `import ExcelJS from "exceljs"` di top-level file yang di-import server.

### Peta error "Map container is already initialized"

**Penyebab:** React Strict Mode + react-leaflet `MapContainer`.

**Solusi:** Peta menggunakan inisialisasi Leaflet manual di `LocationMap.tsx`.

### Kamera / GPS tidak berfungsi

| Masalah | Solusi |
|---------|--------|
| Kamera ditolak | Izinkan kamera di pengaturan browser |
| GPS ditolak | Izinkan lokasi di pengaturan browser/OS |
| Tidak jalan di HP | Akses via **HTTPS** atau **`localhost`** |
| Alamat kosong | Pastikan koneksi internet untuk Nominatim |

### Push GitHub ditolak (403)

**Penyebab:** Login Git dengan akun yang bukan pemilik repo.

**Solusi:** Hapus kredensial lama di Windows Credential Manager → `git:https://github.com`, lalu push ulang dan login dengan akun **`yomari221010-commits`**.

### Database kosong setelah clone

Normal — database dibuat otomatis di `data/payrollin.db` saat pertama absen atau API dipanggil.

---

## Pengembangan Selanjutnya (Saran)

- [ ] Autentikasi pengguna nyata (JWT / session)
- [ ] Multi-user di database (tabel `users`)
- [ ] Sinkronisasi izin & reimbursement ke database
- [ ] Upload foto ke cloud storage (bukan base64 di SQLite)
- [ ] Notifikasi push
- [ ] Deploy ke Vercel / VPS dengan volume persisten untuk SQLite

---

## Lisensi & Kontribusi

Proyek private untuk keperluan absensi karyawan. Untuk kontribusi, buat branch baru dan ajukan Pull Request ke repository GitHub di atas.

---

*Dokumentasi terakhir diperbarui: Juli 2026*
