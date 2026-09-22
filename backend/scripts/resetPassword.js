/**
 * Setel ulang password sebuah akun.
 *
 * Alur "lupa password" lewat email belum tersedia (butuh penyedia SMTP),
 * jadi ini jalan resminya untuk memulihkan akun, termasuk akun lama yang
 * dibuat sebelum kolom email ada.
 *
 * Pakai: node scripts/resetPassword.js <username> <password-baru>
 * Daftar akun: node scripts/resetPassword.js --list
 */
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/userModel');

(async () => {
  const [arg1, arg2] = process.argv.slice(2);

  if (!arg1) {
    console.error('Pakai: node scripts/resetPassword.js <username> <password-baru>');
    console.error('       node scripts/resetPassword.js --list');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    if (arg1 === '--list') {
      const users = await User.find({}, 'username role email').sort({ username: 1 }).lean();
      console.log(`\n${users.length} akun terdaftar:\n`);
      users.forEach((u) =>
        console.log(
          `  ${u.username.padEnd(14)} ${(u.role || 'user').padEnd(6)} ${u.email || '(tanpa email)'}`
        )
      );
      console.log('');
      return;
    }

    if (!arg2) {
      console.error('Password baru wajib diisi.');
      process.exitCode = 1;
      return;
    }
    if (arg2.length < 8) {
      console.error('Password minimal 8 karakter.');
      process.exitCode = 1;
      return;
    }

    const user = await User.findOne({ username: arg1 });
    if (!user) {
      console.error(`Akun "${arg1}" tidak ditemukan. Lihat daftar dengan --list`);
      process.exitCode = 1;
      return;
    }

    // Akun lama tidak punya email, sedangkan skema sekarang mewajibkannya.
    // Isi penampung agar validasi save() lolos tanpa mengubah akun lain.
    if (!user.email) {
      user.email = `${user.username}@belum-diisi.local`;
      console.log(`  Catatan: akun ini belum punya email, diisi sementara ${user.email}`);
    }

    user.password = arg2; // hook pre-save yang melakukan hashing
    await user.save();
    console.log(`Password "${arg1}" berhasil disetel ulang.`);
  } catch (err) {
    console.error('Gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
