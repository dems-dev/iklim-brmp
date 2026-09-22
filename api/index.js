/**
 * Titik masuk Vercel.
 *
 * vercel.json menulis ulang seluruh /api/* ke fungsi ini. Penulisan ulang
 * tidak mengubah `req.url`, jadi jalur aslinya tetap utuh dan Express
 * mencocokkan route seperti biasa.
 *
 * Aplikasi Express diekspor apa adanya. server.js tetap dipakai untuk
 * menjalankan sebagai proses biasa (pengembangan lokal, VPS, Railway).
 */
const { periksaKonfigurasi } = require('../backend/lib/periksaKonfigurasi');

// Dijalankan sekali per instance, saat modul pertama dimuat.
periksaKonfigurasi();

module.exports = require('../backend/app');
