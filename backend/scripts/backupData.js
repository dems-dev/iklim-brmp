/**
 * Mencadangkan seluruh isi database ke berkas JSON.
 *
 * Tier gratis Atlas (M0) tidak menyertakan backup otomatis. Untuk data iklim
 * yang dipakai laporan resmi, kehilangan data lebih mahal daripada risiko
 * keamanan mana pun, jadi pencadangan berkala tidak boleh menunggu upgrade.
 *
 * Hasilnya JSON biasa, bukan format mongodump, supaya bisa dibaca dan
 * diperiksa tanpa memasang MongoDB Database Tools.
 *
 * Pakai:
 *   node scripts/backupData.js               # ke backend/backup/<tanggal>/
 *   node scripts/backupData.js "<uri>"       # cadangkan database lain
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const merah = (t) => `\x1b[31m${t}\x1b[0m`;
const kuning = (t) => `\x1b[33m${t}\x1b[0m`;
const hijau = (t) => `\x1b[32m${t}\x1b[0m`;
const redup = (t) => `\x1b[2m${t}\x1b[0m`;

const samarkan = (uri) => uri.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:****@');

/** 2026-09-10T14:32 → 20260910-1432, aman dipakai sebagai nama folder. */
function capWaktu() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

(async () => {
  const uri = process.argv[2] || process.env.MONGO_URI;
  if (!uri) {
    console.error(merah('\n  MONGO_URI belum diisi.\n'));
    process.exit(1);
  }

  console.log(`\n  Sumber : ${samarkan(uri)}`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    console.error(merah(`\n  Gagal terhubung: ${err.message}\n`));
    process.exit(1);
  }

  const conn = mongoose.connection;
  const tujuan = path.join(__dirname, '..', 'backup', `${conn.name}-${capWaktu()}`);
  fs.mkdirSync(tujuan, { recursive: true });

  const koleksi = await conn.db.listCollections().toArray();
  if (!koleksi.length) {
    console.log(kuning('\n  Database kosong, tidak ada yang dicadangkan.\n'));
    await mongoose.disconnect();
    return;
  }

  console.log(`  Tujuan : ${tujuan}\n`);

  let totalDokumen = 0;
  for (const { name } of koleksi) {
    const dokumen = await conn.db.collection(name).find({}).toArray();
    const berkas = path.join(tujuan, `${name}.json`);
    fs.writeFileSync(berkas, JSON.stringify(dokumen, null, 2), 'utf8');
    const kb = (fs.statSync(berkas).size / 1024).toFixed(1);
    console.log(`   ${name.padEnd(14)} ${String(dokumen.length).padStart(6)} dokumen  ${kb} KB`);
    totalDokumen += dokumen.length;
  }

  console.log(hijau(`\n  Selesai: ${totalDokumen} dokumen dari ${koleksi.length} koleksi.`));
  console.log(
    kuning('  Perhatian: users.json memuat hash password. Simpan seperti Anda menyimpan .env,')
  );
  console.log(kuning('  jangan diunggah ke repo atau dibagikan lewat chat.'));
  console.log(redup('  Folder backend/backup/ sudah dikecualikan dari git.\n'));

  await mongoose.disconnect();
})();
