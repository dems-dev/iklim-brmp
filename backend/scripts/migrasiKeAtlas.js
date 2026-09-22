/**
 * Menyalin data dari satu MongoDB ke MongoDB lain, misalnya dari instalasi
 * lokal ke Atlas.
 *
 * Dua hal yang dijaga di sini:
 *
 * 1. Password TIDAK di-hash ulang. Dokumen ditulis lewat driver mentah,
 *    bukan lewat model, supaya hook pre('save') di userModel tidak jalan
 *    dan mengubah hash yang sudah benar menjadi hash-dari-hash. Kalau itu
 *    terjadi, semua akun tidak bisa login dan penyebabnya sulit ditebak.
 *
 * 2. Bisa dijalankan berulang tanpa menggandakan data. Setiap dokumen
 *    dicocokkan lewat kunci alaminya, bukan _id, lalu di-upsert.
 *
 * Secara bawaan script hanya MENAMPILKAN rencananya. Tambahkan --jalankan
 * untuk benar-benar menulis.
 *
 * Pakai:
 *   node scripts/migrasiKeAtlas.js --dari "<uri asal>" --ke "<uri tujuan>"
 *   node scripts/migrasiKeAtlas.js --dari "<uri asal>" --ke "<uri tujuan>" --jalankan
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const merah = (t) => `\x1b[31m${t}\x1b[0m`;
const kuning = (t) => `\x1b[33m${t}\x1b[0m`;
const hijau = (t) => `\x1b[32m${t}\x1b[0m`;
const redup = (t) => `\x1b[2m${t}\x1b[0m`;

const samarkan = (uri) => uri.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:****@');

/** Ambil nilai argumen bergaya --nama nilai. */
function argumen(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// Kunci alami tiap koleksi: kombinasi field yang menentukan "dokumen yang
// sama", dipakai sebagai filter upsert.
const KOLEKSI = [
  { nama: 'iklims', kunci: ['NAMA_STASIUN', 'TANGGAL'] },
  { nama: 'users', kunci: ['username'] },
];

(async () => {
  const uriDari = argumen('dari') || process.env.MONGO_URI_ASAL;
  const uriKe = argumen('ke') || process.env.MONGO_URI_TUJUAN;
  const jalankan = process.argv.includes('--jalankan');

  if (!uriDari || !uriKe) {
    console.error(merah('\n  Butuh dua URI.\n'));
    console.error('  node scripts/migrasiKeAtlas.js --dari "<uri asal>" --ke "<uri tujuan>"\n');
    console.error(redup('  Tambahkan --jalankan untuk benar-benar menulis.\n'));
    process.exit(1);
  }
  if (uriDari === uriKe) {
    console.error(merah('\n  URI asal dan tujuan sama. Dibatalkan.\n'));
    process.exit(1);
  }

  console.log(`\n  Asal   : ${samarkan(uriDari)}`);
  console.log(`  Tujuan : ${samarkan(uriKe)}`);
  console.log(jalankan ? kuning('  Mode   : MENULIS ke tujuan') : hijau('  Mode   : pratinjau saja (tambah --jalankan untuk menulis)'));

  const opsi = { serverSelectionTimeoutMS: 8000 };
  let asal, tujuan;
  try {
    asal = await mongoose.createConnection(uriDari, opsi).asPromise();
    tujuan = await mongoose.createConnection(uriKe, opsi).asPromise();
  } catch (err) {
    console.error(merah(`\n  Gagal terhubung: ${err.message}\n`));
    process.exit(1);
  }

  console.log(`\n  ${asal.name} → ${tujuan.name}\n`);

  let adaYangDitulis = false;

  for (const { nama, kunci } of KOLEKSI) {
    const sumber = asal.db.collection(nama);
    const target = tujuan.db.collection(nama);

    const total = await sumber.countDocuments();
    const sudahAda = await target.countDocuments();

    if (!total) {
      console.log(`  ${nama.padEnd(8)} ${redup('kosong di asal, dilewati')}`);
      continue;
    }

    console.log(`  ${nama.padEnd(8)} ${total} dokumen di asal, ${sudahAda} sudah ada di tujuan`);

    if (!jalankan) continue;

    const dokumen = await sumber.find({}).toArray();
    const operasi = dokumen.map((doc) => {
      const filter = Object.fromEntries(kunci.map((k) => [k, doc[k]]));
      const { _id, ...isi } = doc;
      return {
        updateOne: {
          filter,
          // _id asli dipertahankan hanya saat dokumen baru dibuat, supaya
          // menjalankan ulang script ini tidak mencoba mengubah _id yang
          // sudah ada, yang akan ditolak MongoDB.
          update: { $set: isi, $setOnInsert: { _id } },
          upsert: true,
        },
      };
    });

    try {
      const hasil = await target.bulkWrite(operasi, { ordered: false });
      console.log(
        hijau(`           ${hasil.upsertedCount} baru, ${hasil.modifiedCount} diperbarui`)
      );
      adaYangDitulis = true;
    } catch (err) {
      console.error(merah(`           Gagal: ${err.message}`));
    }
  }

  if (jalankan && adaYangDitulis) {
    // Index tidak ikut terbawa oleh penyalinan dokumen. Dibangun dari schema
    // yang sama dengan yang dipakai aplikasi, jadi tidak ada definisi ganda.
    console.log('\n  Membangun index di tujuan,');
    for (const berkas of ['iklimModel', 'userModel']) {
      const schema = require(`../models/${berkas}`).schema;
      const nama = berkas.replace('Model', '');
      try {
        await tujuan.model(nama, schema).syncIndexes();
        console.log(hijau(`   ✓ ${nama}`));
      } catch (err) {
        console.error(merah(`   ✗ ${nama}: ${err.message}`));
        console.error(redup('     Biasanya karena ada data kembar yang melanggar index unik.'));
      }
    }
  }

  if (!jalankan) {
    console.log(kuning('\n  Tidak ada yang ditulis. Tambahkan --jalankan bila rencana di atas sudah benar.'));
  }
  console.log('');

  await asal.close();
  await tujuan.close();
})();
