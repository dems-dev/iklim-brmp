const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// Jalur eksplisit: di serverless direktori kerja adalah root proyek, bukan
// backend/, sehingga dotenv tanpa jalur tidak menemukan berkasnya.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const {
  limiterLogin, limiterDaftar, limiterUnggah, limiterUmum,
} = require('./middleware/rateLimit');
const { pastikanDB } = require('./lib/mongoose');

const app = express();

// Di belakang proxy (Nginx, Vercel, Railway) alamat IP asli ada di header
// X-Forwarded-For. Tanpa ini pembatas laju melihat semua orang sebagai satu
// IP yang sama. Dinyalakan lewat env agar tidak bisa dipalsukan saat aplikasi
// diakses langsung tanpa proxy.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// Header keamanan. CSP dimatikan karena frontend dilayani terpisah oleh Vite
// atau hosting statis, yang punya kebijakan sendiri.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Origin frontend yang diizinkan, dari env (pisahkan dengan koma)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:6969')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Di Vercel satu deployment bisa dibuka lewat beberapa alamat: domain
// produksi, alamat unik per deployment, dan alamat per cabang git. Semuanya
// milik project ini sendiri, jadi aman diizinkan otomatis. Tanpa ini login
// gagal dengan galat CORS saat situs dibuka lewat alamat selain CORS_ORIGIN.
['VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_BRANCH_URL', 'VERCEL_URL']
  .map((k) => process.env[k])
  .filter(Boolean)
  .forEach((host) => allowedOrigins.push(`https://${host}`));

const isProduksi = process.env.NODE_ENV === 'production';

// Saat pengembangan, localhost dan 127.0.0.1 adalah host yang sama tapi
// origin yang berbeda bagi browser, begitu pula alamat LAN saat aplikasi
// dibuka dari ponsel. Mengunci ke satu origin membuat login gagal diam-diam
// dengan galat CORS yang tidak informatif. Di produksi tetap ketat.
const originLokal = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.[\d.]+|192\.168\.[\d.]+|172\.(1[6-9]|2\d|3[01])\.[\d.]+)(:\d+)?$/
    .test(origin);

app.use(cors({
  origin: (origin, cb) => {
    // request tanpa origin: curl, Postman, health check
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProduksi && originLokal(origin)) return cb(null, true);

    const err = new Error(
      `Origin tidak diizinkan: ${origin}. ` +
      `Tambahkan ke CORS_ORIGIN di backend/.env bila ini memang alamat frontend Anda.`
    );
    err.status = 403;
    cb(err);
  },
}));
// Batasi ukuran badan permintaan; tanpa ini satu permintaan JSON raksasa
// bisa menghabiskan memori server.
app.use(express.json({ limit: '1mb' }));

// Jaring pengaman umum, dipasang sebelum route
app.use('/api', limiterUmum);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Pastikan database siap sebelum route apa pun yang menyentuhnya.
// Idempoten: bila koneksi sudah ada, langsung lanjut.
app.use('/api', pastikanDB);

// Pembatas ketat untuk endpoint yang rawan disalahgunakan.
// Dipasang di sini, sebelum router, agar berlaku lebih dulu.
app.use('/api/auth/login', limiterLogin);
app.use('/api/auth/register', limiterDaftar);
app.use('/api/iklim/upload', limiterUnggah);

// Routes
app.use('/api/iklim', require('./routes/iklimRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// 404 untuk route API yang tidak dikenal
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}` });
});

// Error handler terpusat, jangan bocorkan detail internal ke klien
app.use((err, req, res, next) => {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Terjadi kesalahan pada server' : err.message,
  });
});

module.exports = app;
