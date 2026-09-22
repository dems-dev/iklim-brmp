const mongoose = require('mongoose');

/**
 * Koneksi MongoDB yang dipakai ulang.
 *
 * Di lingkungan serverless, satu instance fungsi melayani banyak permintaan
 * dan bisa dibekukan lalu dihidupkan lagi. Kalau tiap permintaan memanggil
 * mongoose.connect(), koneksi menumpuk sampai kuota Atlas habis dan database
 * mulai menolak sambungan baru.
 *
 * Cache disimpan di `globalThis` supaya bertahan melewati pemuatan ulang
 * modul yang dilakukan bundler maupun hot reload saat pengembangan.
 */

const KUNCI = Symbol.for('brmp.mongoose');

if (!globalThis[KUNCI]) {
  globalThis[KUNCI] = { conn: null, promise: null };
}
const cache = globalThis[KUNCI];

async function hubungkanDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI belum diisi');

    cache.promise = mongoose
      .connect(uri, {
        // Batasi ukuran pool: tiap instance serverless punya poolnya sendiri,
        // jadi pool besar dikali banyak instance cepat menghabiskan kuota.
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log('MongoDB terhubung:', m.connection.name);
        return m;
      })
      .catch((err) => {
        // Buang promise yang gagal agar percobaan berikutnya bisa mencoba lagi,
        // bukan terus mengembalikan kegagalan yang sama.
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

/** Middleware: pastikan database siap sebelum route mana pun berjalan. */
function pastikanDB(req, res, next) {
  if (cache.conn && mongoose.connection.readyState === 1) return next();

  hubungkanDB()
    .then(() => next())
    .catch((err) => {
      console.error('[db]', err.message);
      res.status(503).json({
        error: 'Database sedang tidak dapat dihubungi. Coba lagi sesaat lagi.',
        code: 'DB_TIDAK_TERSEDIA',
      });
    });
}

module.exports = { hubungkanDB, pastikanDB, mongoose };
