const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username wajib diisi'],
    unique: true,
    trim: true,
    minlength: [3, 'Username minimal 3 karakter'],
  },
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: [8, 'Password minimal 8 karakter'],
  },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Unique-nya sparse: akun lama yang dibuat sebelum kolom email ada
// tidak punya field ini, dan beberapa dokumen tanpa email akan dianggap
// bentrok oleh unique index biasa sehingga index gagal dibangun.
// Akun baru tetap wajib mengisi email lewat validasi `required` di atas.
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
