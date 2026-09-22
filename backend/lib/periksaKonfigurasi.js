/**
 * Pemeriksaan konfigurasi saat server menyala.
 *
 * Kesalahan konfigurasi produksi biasanya tidak terlihat: server tetap
 * menyala, aplikasi tetap jalan, dan celahnya baru ketahuan setelah
 * dimanfaatkan orang. Karena itu di mode produksi masalah serius membuat
 * server MENOLAK menyala, bukan sekadar mencetak peringatan.
 */

const NILAI_CONTOH = [
  'ganti-dengan-secret-acak-minimal-32-karakter',
  'rahasia',
  'secret',
  'changeme',
];

const merah = (t) => `\x1b[31m${t}\x1b[0m`;
const kuning = (t) => `\x1b[33m${t}\x1b[0m`;
const hijau = (t) => `\x1b[32m${t}\x1b[0m`;
const redup = (t) => `\x1b[2m${t}\x1b[0m`;

function periksaKonfigurasi() {
  const produksi = process.env.NODE_ENV === 'production';
  const galat = [];
  const peringatan = [];

  // --- JWT_SECRET ---
  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    galat.push('JWT_SECRET belum diisi. Token tidak bisa ditandatangani.');
  } else if (NILAI_CONTOH.includes(secret)) {
    galat.push('JWT_SECRET masih memakai nilai contoh. Ganti dengan nilai acak.');
  } else if (secret.length < 32) {
    (produksi ? galat : peringatan).push(
      `JWT_SECRET hanya ${secret.length} karakter. Minimal 32; buat dengan ` +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  // --- MONGO_URI ---
  const mongo = process.env.MONGO_URI || '';
  if (!mongo) {
    galat.push('MONGO_URI belum diisi.');
  } else if (produksi) {
    if (/localhost|127\.0\.0\.1/.test(mongo)) {
      peringatan.push(
        'MONGO_URI menunjuk ke localhost di mode produksi. Pastikan database ' +
          'memang berada di mesin yang sama.'
      );
    }
    // mongodb:// tanpa kredensial berarti autentikasi mati
    if (/^mongodb(\+srv)?:\/\/[^@]*$/.test(mongo)) {
      galat.push(
        'MONGO_URI tidak memuat kredensial, artinya autentikasi MongoDB mati. ' +
          'Aktifkan autentikasi atau gunakan MongoDB Atlas sebelum dipublikasikan.'
      );
    }
    if (!/^mongodb\+srv:/.test(mongo) && !/tls=true|ssl=true/.test(mongo)) {
      peringatan.push('Koneksi MongoDB tampaknya tanpa TLS. Aktifkan bila melintasi jaringan.');
    }
  }

  // --- CORS ---
  // Celah paling mudah terlewat: aturan longgar untuk localhost dan LAN hanya
  // dimatikan oleh NODE_ENV=production. Kalau variabel itu lupa diset di
  // hosting, aturan longgar ikut terbawa.
  if (!produksi) {
    peringatan.push(
      'NODE_ENV bukan "production". Origin localhost dan LAN diizinkan otomatis. ' +
        'WAJIB set NODE_ENV=production saat dipublikasikan.'
    );
  } else if (!process.env.CORS_ORIGIN) {
    galat.push('CORS_ORIGIN belum diisi di mode produksi. Isi dengan domain frontend Anda.');
  } else if (/localhost|127\.0\.0\.1/.test(process.env.CORS_ORIGIN)) {
    peringatan.push('CORS_ORIGIN masih memuat localhost di mode produksi.');
  }

  // --- Laporan ---
  const label = produksi ? hijau('PRODUKSI') : kuning('PENGEMBANGAN');
  console.log(`\n  Mode: ${label}`);

  if (peringatan.length) {
    console.log(kuning('\n  Peringatan:'));
    peringatan.forEach((p) => console.log(kuning('   ! ') + p));
  }

  if (galat.length) {
    console.log(merah('\n  Konfigurasi bermasalah:'));
    galat.forEach((g) => console.log(merah('   x ') + g));

    if (produksi) {
      console.log(
        merah('\n  Server dihentikan. Perbaiki konfigurasi di atas lalu jalankan ulang.\n')
      );
      process.exit(1);
    }
    console.log(
      redup('\n  (Di mode pengembangan ini hanya peringatan, di produksi server akan berhenti.)')
    );
  }

  if (!peringatan.length && !galat.length) {
    console.log(hijau('  Konfigurasi aman.'));
  }
  console.log('');
}

module.exports = { periksaKonfigurasi };
