const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const signToken = (user) =>
  jwt.sign(
    { userId: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

exports.register = async (req, res) => {
  // CATATAN: `role` sengaja TIDAK diambil dari req.body.
  // Sebelumnya siapa pun bisa mendaftar sebagai admin lewat body request.
  // Semua pendaftaran mandiri selalu jadi 'user'; promosi ke admin
  // dilakukan lewat endpoint terpisah oleh admin yang sudah ada.
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, dan password wajib diisi' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' });
  }

  try {
    const user = await User.create({ username, email, password, role: 'user' });
    res.status(201).json({
      message: 'Registrasi berhasil',
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] === 'email' ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} sudah terdaftar` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(error.errors).map(e => e.message).join(', '),
      });
    }
    console.error('[register]', error);
    res.status(500).json({ error: 'Registrasi gagal' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const user = await User.findOne({ username });

    // Pesan error sengaja disamakan agar tidak membocorkan
    // username mana yang terdaftar (user enumeration).
    const invalid = { error: 'Username atau password salah' };
    if (!user) return res.status(401).json(invalid);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(invalid);

    res.json({
      token: signToken(user),
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Profil user yang sedang login (dipakai frontend untuk cek role)
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username email role createdAt');
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    res.json({ user });
  } catch (error) {
    console.error('[me]', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};
