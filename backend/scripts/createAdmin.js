/**
 * Membuat atau mempromosikan akun admin.
 * Endpoint /register selalu membuat role 'user', jadi admin pertama
 * dibuat lewat script ini.
 *
 * Pakai: node scripts/createAdmin.js <username> <email> <password>
 */
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/userModel');

(async () => {
  const [username, email, password] = process.argv.slice(2);

  if (!username || !email || !password) {
    console.error('Pakai: node scripts/createAdmin.js <username> <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password minimal 8 karakter.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ username });
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log(`Akun "${username}" dipromosikan menjadi admin.`);
    } else {
      await User.create({ username, email, password, role: 'admin' });
      console.log(`Admin "${username}" berhasil dibuat.`);
    }
  } catch (err) {
    console.error('Gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
