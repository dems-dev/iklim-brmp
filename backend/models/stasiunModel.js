const mongoose = require("mongoose");

// Registri stasiun: nama resmi + metadata lokasi. Data harian tetap merujuk
// lewat NAMA_STASIUN (huruf kapital), koordinat cukup disimpan sekali di sini
// alih-alih diulang di setiap baris data.
const stasiunSchema = new mongoose.Schema({
  NAMA: { type: String, required: true, unique: true, trim: true },
  LABEL: { type: String, trim: true },
  WILAYAH: { type: String, trim: true },
  TIPE: { type: String, trim: true },
  LINTANG: Number,
  BUJUR: Number,
  ELEVASI: Number,
}, { timestamps: true });

module.exports = mongoose.model("Stasiun", stasiunSchema);
