/**
 * Memeriksa koneksi MongoDB dan melaporkan isinya.
 *
 * Gunanya: memastikan MONGO_URI Atlas benar SEBELUM deploy, bukan setelah
 * fungsi di produksi gagal dengan pesan yang sulit dibaca. Script ini tidak
 * pernah menulis apa pun, jadi aman dijalankan ke database mana saja.
 *
 * Pakai:
 *   node scripts/cekKoneksi.js            # pakai MONGO_URI dari .env
 *   node scripts/cekKoneksi.js "<uri>"    # uji URI lain tanpa mengubah .env
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const merah = (t) => `\x1b[31m${t}\x1b[0m`;
const kuning = (t) => `\x1b[33m${t}\x1b[0m`;
const hijau = (t) => `\x1b[32m${t}\x1b[0m`;
const redup = (t) => `\x1b[2m${t}\x1b[0m`;

/** Sembunyikan password agar aman dicetak ke layar atau ditempel ke chat. */
function samarkan(uri) {
  return uri.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:****@');
}

(async () => {
  const uri = process.argv[2] || process.env.MONGO_URI;

  if (!uri) {
    console.error(merah('\n  MONGO_URI belum diisi di .env dan tidak diberikan sebagai argumen.\n'));
    process.exit(1);
  }

  console.log(`\n  URI    : ${samarkan(uri)}`);

  const pakaiSrv = /^mongodb\+srv:/.test(uri);
  const adaKredensial = /\/\/[^:@/]+:[^@]+@/.test(uri);
  const keLokal = /localhost|127\.0\.0\.1/.test(uri);

  console.log(`  Bentuk : ${pakaiSrv ? 'mongodb+srv (Atlas, TLS otomatis)' : 'mongodb:// biasa'}`);
  if (!adaKredensial) {
    console.log(kuning('  ! URI tidak memuat kredensial, artinya autentikasi database mati.'));
  }
  if (keLokal) {
    console.log(redup('  (menunjuk ke database lokal)'));
  }

  const mulai = Date.now();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    console.error(merah(`\n  Gagal terhubung: ${err.message}\n`));
    console.error(redup('  Penyebab yang paling sering:'));
    console.error(redup('   - IP Anda belum masuk Network Access di Atlas'));
    console.error(redup('   - password salah, atau mengandung karakter @ : / ? yang belum di-URL-encode'));
    console.error(redup('   - nama database belum ditulis di URI (…mongodb.net/brmp?…)\n'));
    process.exit(1);
  }

  const conn = mongoose.connection;
  console.log(hijau(`\n  Terhubung dalam ${Date.now() - mulai} ms`));
  console.log(`  Database: ${conn.name}`);

  const koleksi = await conn.db.listCollections().toArray();
  if (!koleksi.length) {
    console.log(kuning('\n  Database masih kosong, belum ada koleksi.'));
  } else {
    console.log('\n  Koleksi:');
    for (const { name } of koleksi) {
      const jumlah = await conn.db.collection(name).countDocuments();
      console.log(`   - ${name.padEnd(14)} ${String(jumlah).padStart(6)} dokumen`);
    }
  }

  // Index unik adalah yang menjaga satu stasiun tidak punya dua baris di
  // tanggal yang sama. Kalau hilang, upload ulang akan menggandakan data
  // alih-alih memperbaruinya, dan itu baru ketahuan setelah datanya kacau.
  const cekIndex = async (namaKoleksi, kunci, keterangan) => {
    if (!koleksi.some((k) => k.name === namaKoleksi)) return;
    const daftar = await conn.db.collection(namaKoleksi).indexes();
    const ada = daftar.some((i) => i.name === kunci && i.unique);
    console.log(ada ? hijau(`   ✓ ${keterangan}`) : merah(`   ✗ ${keterangan} BELUM ADA`));
  };

  console.log('\n  Index penting:');
  await cekIndex('iklims', 'NAMA_STASIUN_1_TANGGAL_1', 'iklims: unik per (stasiun, tanggal)');
  await cekIndex('users', 'username_1', 'users: username unik');
  await cekIndex('users', 'email_1', 'users: email unik');

  console.log(redup('\n  Index dibuat otomatis saat aplikasi pertama kali menyala.'));
  console.log('');

  await mongoose.disconnect();
})();
