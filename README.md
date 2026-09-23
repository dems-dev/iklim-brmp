# Platform Informasi Iklim BRMP Agroklimat

Aplikasi pengelolaan data iklim harian dari stasiun AWS milik Balai Perakitan
dan Pengujian Agroklimat dan Hidrologi Pertanian.

**Stack:** React 19 + Vite + Tailwind + Recharts · Express 5 + Mongoose 8 + MongoDB

**Demo:** [iklim-brmp.vercel.app](https://iklim-brmp.vercel.app). Klik **Masuk
sebagai demo** di halaman login (akses baca saja).

> Seluruh data di demo adalah **data sintetis** yang dibuat mengikuti format dan
> pola data stasiun AWS, bukan hasil pengukuran sebenarnya.

---

## Menjalankan

### 1. Prasyarat
- Node.js 18+
- MongoDB berjalan di lokal (atau isi `MONGO_URI` ke server lain)

### 2. Instalasi
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Konfigurasi environment

**`backend/.env`**, salin dari `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```
Lalu **wajib** ganti `JWT_SECRET` dengan nilai acak:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**`frontend/.env`**, salin dari `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env
```

> `.env` tidak ikut ter-commit. Hanya `.env.example` yang masuk repo.

### 4. Buat akun admin pertama

Endpoint `/api/auth/register` **selalu** membuat akun dengan role `user`.
Admin pertama dibuat lewat script:

```bash
cd backend
node scripts/createAdmin.js <username> <email> <password>
```

Script yang sama juga bisa mempromosikan akun yang sudah ada menjadi admin.

**Lupa password?** Belum ada alur reset lewat email, jadi pemulihan dilakukan
lewat script:

```bash
cd backend
node scripts/resetPassword.js --list                 # lihat semua akun
node scripts/resetPassword.js <username> <password>  # setel ulang
```

> **Catatan CORS.** `CORS_ORIGIN` menentukan origin frontend yang diizinkan.
> Saat pengembangan (`NODE_ENV` bukan `production`), origin lokal
> (`localhost`, `127.0.0.1`, dan alamat LAN) otomatis diizinkan, karena
> browser memperlakukan `localhost:6969` dan `127.0.0.1:6969` sebagai origin
> berbeda dan login akan gagal diam-diam kalau hanya satu yang terdaftar.
> Di produksi, hanya yang tercantum di `CORS_ORIGIN` yang diterima.

### 5. Jalankan
```bash
npm start          # backend :5000 + frontend :6969 sekaligus
```

Atau terpisah: `npm run server` / `npm run client`.

---

## Halaman

| Rute | Isi | Akses |
|---|---|---|
| `/` | Beranda, penjelasan platform, daftar variabel, kode khusus | publik |
| `/login` `/register` | Masuk & daftar | publik |
| `/dasbor` | Ringkasan jaringan, grafik, seluruh 10 variabel | login |
| `/data` | Eksplorasi: saring, grafik, tabel, ekspor | login |
| `/mutu` | Audit mutu data | login |
| `/unggah` | Unggah berkas Excel | admin |

Tombol **◐ / ◑** di kanan atas mengganti mode terang/gelap; pilihannya
tersimpan di peramban.

## Hak akses

| Aksi | user | admin |
|---|:---:|:---:|
| Login, lihat data, cari, grafik | ✅ | ✅ |
| Export Excel / PDF | ✅ | ✅ |
| Upload Excel | ❌ | ✅ |

Registrasi mandiri selalu menghasilkan role `user`. Role tidak bisa diatur
lewat body request.

---

## Format file Excel untuk upload

| Kolom | Wajib | Keterangan |
|---|:---:|---|
| `Stasiun` |, | Nama stasiun per baris. Bila ada, satu berkas boleh berisi banyak stasiun |
| `Date` | ✅ | Tanggal (format Excel date atau teks yang bisa diparse) |
| `TN` `TX` `TM` | ✅ | Suhu min / maks / rata-rata (°C) |
| `UN` `UX` `UM` |, | Kelembapan min / maks / rata-rata (%) |
| `RR` |, | Curah hujan (mm) |
| `GIX` |, | Arah angin saat kecepatan maksimum (°) |
| `VT` |, | Kecepatan angin rata-rata (m/s) |
| `RG` |, | Radiasi global (W/m²) |

**Kode khusus:** `8888` = data tidak terukur · `9999` = tidak ada pengukuran.

**Contoh siap pakai:**
[`contoh-data/contoh-unggah-AWS-KP-PACET-2025-01.xlsx`](contoh-data/contoh-unggah-AWS-KP-PACET-2025-01.xlsx)
berisi 31 hari data sintetis (Januari 2025) dengan beberapa kode `8888`/`9999`.
Sheet keduanya, *Petunjuk*, merangkum aturan di bawah dan diabaikan saat
unggah. Salin file ini sebagai titik awal membuat data sendiri.

Aturan tata letak:
- Data harus berada di **sheet pertama**; sheet lain tidak dibaca.
- **Baris 1** adalah header dengan nama kolom persis seperti tabel di atas.
- Satu baris untuk satu hari. `Date` berupa sel tanggal Excel, atau teks
  `yyyy-mm-dd`.
- Nilai harus konsisten: `TN ≤ TM ≤ TX` dan `UN ≤ UM ≤ UX`, dengan UX tidak
  melebihi 100. Nilai di luar aturan ini tetap tersimpan, tapi akan muncul
  sebagai temuan di halaman Mutu.

**Berkas banyak stasiun:** tambahkan kolom `Stasiun` di sheet data. Stasiun
yang belum terdaftar otomatis didaftarkan dan dilaporkan sebagai "baru" di
hasil unggah, supaya salah ketik nama cepat ketahuan. Metadata lokasi boleh
ditaruh di sheet bernama `Stasiun` dengan kolom `Stasiun, Wilayah, Tipe,
Lintang, Bujur, Elevasi_m`, atau sebagai kolom yang sama di sheet data.
Koordinat disimpan sekali per stasiun di koleksi `Stasiun`, bukan per baris.

**Catatan penting:**
- Tanpa kolom `Stasiun`, nama stasiun diambil dari **dropdown**, bukan dari
  nama file. Dropdown hanya menerima stasiun yang sudah terdaftar.
- Bila stasiun dan tanggal yang sama muncul lebih dari sekali, **seluruh unggahan
  dibatalkan**. Ini menangkap berkas multi-stasiun yang lupa diberi kolom
  `Stasiun`, yang kalau diteruskan akan saling menimpa tanpa ketahuan.
- Baris dengan tanggal tidak valid **dilewati dan dilaporkan**, tidak lagi
  diisi tanggal hari ini.
- Upload ulang periode yang sama akan **memperbarui** data lama. Kombinasi
  (stasiun, tanggal) dijaga unik di level database.
- Data historis (lebih lama dari data terakhir) kini **diterima**.
- File diproses di memori, tidak ditulis ke disk.

---

## Struktur

```
backend/
  app.js                  Express app, CORS, error handler
  server.js               Koneksi MongoDB + listen
  lib/iklimFormat.js      Definisi variabel iklim (dipakai export Excel & PDF)
  middleware/auth.js      Verifikasi JWT + requireRole
  lib/stasiun.js          Stasiun bawaan + gabungan daftar stasiun terdaftar
  models/                 Skema Mongoose (Iklim, Stasiun, User)
  controllers/            Logika upload, cari, export
  routes/                 Definisi endpoint
  scripts/
    createAdmin.js        Pembuatan akun admin
    resetPassword.js      Setel ulang password lewat CLI
    cekKoneksi.js         Uji MONGO_URI, tidak menulis apa pun
    migrasiKeAtlas.js     Salin data antar database, idempoten
    backupData.js         Cadangkan seluruh koleksi ke JSON
frontend/
  src/lib/api.js          Axios client terpusat (token + handling 401/403)
  src/pages/              Halaman (Beranda, Dasbor, Eksplorasi, Mutu, Unggah, Masuk)
  src/components/         Shell, komponen UI, grafik
api/index.js              Titik masuk fungsi Vercel
contoh-data/              Contoh file unggah (data sintetis)
```

## Endpoint

| Method | Path | Akses |
|---|---|---|
| GET | `/api/health` | publik |
| POST | `/api/auth/register` | publik |
| POST | `/api/auth/login` | publik |
| GET | `/api/auth/me` | login |
| GET | `/api/iklim/search` | login |
| GET | `/api/iklim/stations` | login |
| GET | `/api/iklim/statistics` | login |
| GET | `/api/iklim/export/excel` | login |
| GET | `/api/iklim/export/pdf` | login |
| POST | `/api/iklim/upload` | admin |

---

## Validasi rentang nilai

Setiap nilai yang diunggah diperiksa terhadap dua lapis batas
(`backend/lib/validasiIklim.js`):

| Variabel | Batas fisik (error) | Rentang wajar (peringatan) |
|---|---|---|
| TN | -10 – 45 °C | 5 – 32 |
| TX | -5 – 50 °C | 12 – 42 |
| TM | -5 – 45 °C | 8 – 38 |
| UN / UX / UM | 0 – 105 % | 0 – 100 |
| RR | 0 – 500 mm | 0 – 200 |
| GIX | 0 – 360 ° | 0 – 360 |
| VT | 0 – 500 | 0 – 300 |
| RG | 0 – 4000 | 0 – 2500 |

Ditambah pemeriksaan konsistensi antar-kolom, yang menangkap kolom tertukar
saat penyusunan file:

- `TN ≤ TM ≤ TX` (suhu min ≤ rata-rata ≤ maks)
- `UN ≤ UM ≤ UX` (kelembapan min ≤ rata-rata ≤ maks)

**Perilaku:**
- Kode `8888` dan `9999` selalu dikecualikan dari semua pemeriksaan.
- Secara default data **tetap disimpan** dan temuannya dilaporkan ke operator
 , rekaman pengukuran tidak dibuang diam-diam.
- Centang **Mode ketat** saat upload untuk membatalkan seluruh upload jika ada
  nilai di luar batas fisik, agar file sumbernya diperbaiki lebih dulu.

**Audit data lama:**
```
GET /api/iklim/validasi/audit?stasiun=&startDate=&endDate=
GET /api/iklim/validasi/rentang
```

Hasil audit terhadap 286 data yang sudah ada: **2 error, 21 peringatan**,
seluruhnya pada kolom UX (kelembapan maksimum di atas 100%).

### ⚠️ Satuan VT dan RG perlu dikonfirmasi

Data yang ada tidak cocok dengan label satuannya saat ini:

| Variabel | Label sekarang | Data aktual | Masalah |
|---|---|---|---|
| VT | m/s | 0 – 265, median 21 | 265 m/s = 954 km/jam, mustahil. Lebih cocok sebagai **wind run (km/hari)** |
| RG | W/m² | 272 – 2001, median 996 | 2001 W/m² melampaui konstanta surya (1361). Lebih cocok sebagai **total radiasi harian (J/cm²/hari)**, 2001 J/cm² ≈ 20 MJ/m²/hari, khas tropis |

Ini memengaruhi 88 dan 42 dari 286 data (31% dan 15%), sistematis, bukan
outlier. Label satuan ini muncul di laporan Excel dan PDF resmi, jadi sebaiknya
dipastikan dulu ke penyedia data AWS sebelum laporan disebarkan. Setelah
dipastikan, perbaiki di `backend/lib/iklimFormat.js` (satu tempat, otomatis
ikut berubah di semua laporan).

---

## Menyiapkan untuk hosting publik

Server **menolak menyala** di mode produksi bila konfigurasinya berisiko, dan
keluar dengan kode 1 sehingga platform hosting mendeteksinya sebagai gagal.

### Yang wajib diatur

| Variabel | Nilai | Kenapa |
|---|---|---|
| `NODE_ENV` | `production` | Tanpa ini, origin `localhost` dan LAN tetap diizinkan CORS |
| `JWT_SECRET` | acak, minimal 32 karakter | Harus berbeda dari yang dipakai saat pengembangan |
| `MONGO_URI` | **berkredensial** | Tanpa kredensial berarti autentikasi MongoDB mati |
| `CORS_ORIGIN` | domain frontend | Tanpa ini server menolak menyala |
| `TRUST_PROXY` | `1` bila di belakang proxy | Agar pembatas laju melihat IP asli |

### Soal MongoDB

Instalasi MongoDB bawaan **tidak memakai autentikasi**. Itu aman selama hanya
mendengarkan di `127.0.0.1`, tapi berbahaya begitu terbuka ke jaringan.
Pilihannya:

- **MongoDB Atlas** (paling mudah). Autentikasi dan TLS wajib sejak awal, jadi
  tidak bisa lupa. Cukup ganti `MONGO_URI`, kode tidak berubah. Langkah
  lengkapnya ada di [Menyiapkan MongoDB Atlas](#menyiapkan-mongodb-atlas).
- **VPS sendiri**: jalankan dengan `--auth`, buat user khusus untuk database
  `brmp` saja (bukan root), tetap ikat ke `127.0.0.1` bila aplikasi berada di
  mesin yang sama, dan jangan buka port 27017 ke publik.

### Pembatas laju

| Endpoint | Batas |
|---|---|
| `POST /api/auth/login` | 10 percobaan **gagal** per 15 menit (yang berhasil tidak dihitung) |
| `POST /api/auth/register` | 5 per jam |
| `POST /api/iklim/upload` | 30 per 15 menit |
| Seluruh `/api` | 600 per 15 menit |

Header keamanan dipasang lewat `helmet`, dan badan permintaan JSON dibatasi 1 MB.

---

## Menyiapkan MongoDB Atlas

### 1. Cluster

Daftar di [mongodb.com/atlas](https://www.mongodb.com/atlas), buat cluster
**M0** (gratis). Pilih region terdekat, mis. Singapore `ap-southeast-1`, karena
jarak ke database menentukan waktu tanggap tiap permintaan.

### 2. User database

Database Access → Add New Database User.

| Isian | Nilai |
|---|---|
| Username | `brmp_app` |
| Password | **Autogenerate**, lalu salin |
| Role | **Only read and write to any database** → batasi ke database `brmp` |

Jangan pakai `atlasAdmin`. Aplikasi ini hanya perlu membaca dan menulis satu
database; kalau kredensialnya bocor, kerusakannya terbatas di situ.

Bikin password sendiri bila mau, yang bebas karakter bermasalah:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

> Password yang memuat `@ : / ? # %` **harus di-URL-encode** di connection
> string (`@` menjadi `%40`, dan seterusnya). Kalau tidak, koneksi gagal
> dengan pesan yang menyesatkan. `base64url` di atas tidak pernah menghasilkan
> karakter itu.

### 3. Akses jaringan

Network Access → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`),
beri keterangan "Vercel serverless, IP dinamis".

Ini memang melemahkan satu lapisan pertahanan, dan disengaja: IP fungsi Vercel
berubah-ubah sehingga tidak bisa didaftarkan. Konsekuensinya **satu-satunya
penghalang antara internet dan database adalah password user tadi**, jadi
password itu harus acak dan tidak dipakai di tempat lain. Menutup celah ini
butuh PrivateLink (Atlas M10+) atau Secure Compute (Vercel Enterprise).

Selama masih menguji dari komputer sendiri, daftarkan IP Anda saja dulu.

### 4. Connection string

Connect → Drivers → Node.js. Bentuknya:

```
mongodb+srv://brmp_app:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Dua hal yang **wajib** disunting, dan keduanya mudah terlewat:

1. Ganti `<db_password>` dengan password sungguhan (hapus tanda kurung sudutnya)
2. Sisipkan nama database sebelum tanda tanya: `.mongodb.net/brmp?retryWrites=…`

Tanpa nomor 2, Mongoose menulis ke database bernama `test` dan datanya seolah
hilang.

### 5. Uji sebelum dipakai

```bash
npm run cek-koneksi -- "mongodb+srv://brmp_app:...@cluster0.xxxxx.mongodb.net/brmp?retryWrites=true&w=majority"
```

Script ini tidak menulis apa pun. Keluarannya menyebut nama database, jumlah
dokumen per koleksi, dan status index unik, jadi salah ketik langsung terlihat
di sini alih-alih setelah deploy.

### 6. Pindahkan data yang sudah ada

```bash
# Lihat rencananya dulu, belum menulis apa-apa
npm run migrasi -- --dari "mongodb://localhost:27017/brmp" --ke "<uri atlas>"

# Kalau angkanya sudah benar
npm run migrasi -- --dari "mongodb://localhost:27017/brmp" --ke "<uri atlas>" --jalankan
```

Script menyalin lewat driver mentah, bukan lewat model, supaya hook
`pre('save')` di `userModel` tidak menghash ulang password yang sudah ter-hash,
yang akan membuat semua akun gagal login. Pencocokan memakai kunci alami
(stasiun+tanggal, dan username), jadi menjalankannya dua kali tidak
menggandakan data. Index dibangun ulang di tujuan dari schema yang sama.

### 7. Cadangan

M0 **tidak punya backup otomatis**. Sampai naik tier, jalankan berkala:

```bash
npm run backup
```

Hasilnya JSON per koleksi di `backend/backup/<nama-db>-<tanggal>/`, sudah
dikecualikan dari git. `users.json` memuat hash password, jadi perlakukan
seperti `.env`.

### 8. Ganti rahasia lama

`backend/.env` sempat ikut tercommit, jadi `JWT_SECRET` dan `MONGO_URI` lama
harus dianggap sudah diketahui orang. Password Atlas otomatis baru; `JWT_SECRET`
diganti terpisah:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Mengganti `JWT_SECRET` membuat semua token yang beredar tidak berlaku, jadi
semua pengguna perlu login ulang. Itu memang tujuannya.

---

## Deploy ke Vercel

Frontend dan backend berjalan di satu domain. Kode sudah disiapkan; yang
tersisa adalah menyediakan akun dan mengisi variabel lingkungan.

### Berkas yang mengatur deploy

| Berkas | Fungsi |
|---|---|
| `vercel.json` | Perintah build, region `sin1` (Singapura), rewrite `/api/*` ke fungsi dan rewrite SPA |
| `api/index.js` | Titik masuk serverless; mengekspor aplikasi Express apa adanya |
| `backend/lib/mongoose.js` | Koneksi database yang dipakai ulang antar invocation |
| `.vercelignore` | Mencegah `.env` dan cadangan database ikut terunggah saat deploy lewat CLI |

Region fungsi sengaja disamakan dengan region cluster Atlas. Bila berbeda benua,
setiap query menyeberang samudra dan satu halaman dasbor bisa butuh detik.

Dependensi backend berada di `package.json` **root** agar dapat di-resolve dari
`api/`. `backend/package.json` tetap ada supaya backend bisa dijalankan sendiri.

### Langkah

**1. Database.** Ikuti [Menyiapkan MongoDB Atlas](#menyiapkan-mongodb-atlas)
sampai langkah 6, sehingga connection string sudah teruji dan datanya sudah
pindah sebelum deploy pertama.

**2. Redis (opsional)** untuk pembatas laju. Dari Vercel Marketplace:

```bash
vercel link
vercel integration add redis --yes
vercel env pull --yes
```

Tanpa Redis aplikasi tetap jalan, tapi hitungan pembatas laju tidak dipakai
bersama antar instance sehingga batasnya melemah.

**3. Variabel lingkungan** di Vercel (Settings → Environment Variables):

| Nama | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | connection string Atlas, **lengkap dengan kredensial** |
| `JWT_SECRET` | acak, minimal 32 karakter |
| `CORS_ORIGIN` | domain Vercel Anda, mis. `https://agroklimat.vercel.app` |
| `TRUST_PROXY` | `1` |
| `REDIS_URL` | terisi otomatis oleh integrasi Redis (opsional) |
| `VITE_DEMO_USERNAME` | username akun demo (opsional, dibaca saat build) |
| `VITE_DEMO_PASSWORD` | password akun demo (opsional, ikut tertanam di bundel) |

Buat `JWT_SECRET` dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`VITE_API_URL` **tidak perlu diisi**. Frontend otomatis memakai jalur relatif
`/api` bila tidak dijalankan di localhost.

**4. Deploy.**

```bash
vercel --prod
```

Bila ada variabel yang salah atau hilang, fungsi akan gagal dengan pesan yang
menyebutkan persis apa yang kurang, bukan menyala diam-diam.

**5. Admin pertama.** Endpoint registrasi selalu membuat peran `user`. Jalankan
dari komputer Anda dengan `MONGO_URI` produksi:

```bash
cd backend
MONGO_URI="<connection string Atlas>" node scripts/createAdmin.js <user> <email> <password>
```

**6. Akun demo** (bila `VITE_DEMO_*` diisi). Daftarkan lewat endpoint registrasi
agar perannya pasti `user`:

```bash
curl -X POST https://<domain>/api/auth/register -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@example.com","password":"<VITE_DEMO_PASSWORD>"}'
```

Akun `user` tidak bisa mengunggah dan belum ada endpoint ganti password, jadi
pengunjung tidak bisa mengubah atau mengunci akun ini.

### Alternatif tanpa serverless

Bila lebih suka backend sebagai proses biasa (Railway, Render, VPS), tidak ada
yang perlu diubah: `server.js` tetap berfungsi seperti semula dan pembatas laju
berbasis memori sudah memadai karena hanya ada satu proses. Konsekuensinya,
tier gratis di sebagian penyedia menidurkan aplikasi saat menganggur sehingga
kunjungan pertama terasa lambat.

---

## Belum selesai

### Reset password
Belum ada alur reset lewat email; pemulihan akun saat ini lewat
`backend/scripts/resetPassword.js`. Alur lewat email butuh:

1. Endpoint backend `POST /api/auth/forgot-password` dan
   `POST /api/auth/reset-password/:token`
2. Penyedia email (mis. nodemailer + SMTP) untuk mengirim link reset,
   perlu kredensial dari pihak BRMP
3. Field token reset + masa berlaku di `userModel`

Sampai itu tersedia, tombol "Lupa Password?" sengaja dihilangkan dari halaman
login agar pengguna tidak menekan tombol yang dijamin error.

### Akun lama tanpa email
Enam akun yang dibuat sebelum kolom `email` ada tidak punya email. Index unique
pada email bersifat `sparse` sehingga akun-akun itu tetap bisa login. Akun baru
wajib mengisi email.

### Belum ada test otomatis
`npm test` di backend masih placeholder.

---

## Kredit

Versi awal proyek dikerjakan oleh [@boyjambre](https://github.com/boyjambre)
di [boyjambre/Project_BRMP](https://github.com/boyjambre/Project_BRMP).
Repositori ini melanjutkannya dengan perombakan backend, antarmuka, validasi
mutu data, dan penyiapan deploy.
