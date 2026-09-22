const rateLimit = require('express-rate-limit');

/**
 * Pembatas laju permintaan.
 *
 * Tanpa ini, endpoint login bisa dicoba ribuan kali tanpa hambatan sehingga
 * password lemah pasti ketemu.
 *
 * PENYIMPAN HITUNGAN
 * Bawaan express-rate-limit menyimpan hitungan di memori proses. Itu benar
 * selama aplikasi berjalan sebagai satu proses (VPS, Railway, Render), tapi
 * TIDAK cukup di serverless: permintaan tersebar ke banyak instance yang
 * masing-masing punya hitungan sendiri, sehingga batas efektifnya berlipat.
 *
 * Karena itu, bila REDIS_URL tersedia hitungan dipindah ke Redis agar dipakai
 * bersama seluruh instance. Bila tidak, kembali ke memori dan peringatan
 * dicetak saat mode produksi.
 */

const nonaktif = process.env.NODE_ENV === 'test';
const produksi = process.env.NODE_ENV === 'production';

let bikinStore = () => undefined; // undefined = MemoryStore bawaan
let modePenyimpan = 'memori';

if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis');
    const { RedisStore } = require('rate-limit-redis');

    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (e) => console.error('[redis]', e.message));
    // Sambungkan sekali; kegagalan tidak menjatuhkan server, hanya dicatat.
    client.connect().catch((e) => console.error('[redis] gagal terhubung:', e.message));

    bikinStore = (prefix) =>
      new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: `rl:${prefix}:`,
      });
    modePenyimpan = 'redis';
  } catch (e) {
    console.error('[rate-limit] Redis tidak dapat dipakai, kembali ke memori:', e.message);
  }
}

if (produksi && modePenyimpan === 'memori') {
  console.warn(
    '\x1b[33m  ! Pembatas laju memakai penyimpan MEMORI di mode produksi.\x1b[0m\n' +
      '    Aman bila aplikasi berjalan sebagai satu proses. Bila di-deploy ke\n' +
      '    serverless (Vercel, Lambda), isi REDIS_URL agar hitungan dipakai\n' +
      '    bersama antar instance.'
  );
}

const buat = (nama, { windowMs, max, pesan, skipSukses = false }) =>
  rateLimit({
    windowMs,
    max,
    store: bikinStore(nama),
    skipSuccessfulRequests: skipSukses,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => nonaktif,
    handler: (req, res) => {
      const menit = Math.ceil(windowMs / 60000);
      res.status(429).json({
        error: pesan,
        code: 'TERLALU_BANYAK_PERMINTAAN',
        cobaLagiDalam: `${menit} menit`,
      });
    },
  });

/* Login: hanya percobaan GAGAL yang dihitung, jadi pemakaian normal tidak
   pernah tersendat sementara tebak-tebakan password cepat berhenti. */
const limiterLogin = buat('login', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSukses: true,
  pesan: 'Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.',
});

const limiterDaftar = buat('daftar', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  pesan: 'Terlalu banyak pendaftaran dari alamat ini. Coba lagi nanti.',
});

const limiterUnggah = buat('unggah', {
  windowMs: 15 * 60 * 1000,
  max: 30,
  pesan: 'Terlalu banyak unggahan berturut-turut. Beri jeda sebentar.',
});

const limiterUmum = buat('umum', {
  windowMs: 15 * 60 * 1000,
  max: 600,
  pesan: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.',
});

module.exports = {
  limiterLogin,
  limiterDaftar,
  limiterUnggah,
  limiterUmum,
  modePenyimpan,
};
