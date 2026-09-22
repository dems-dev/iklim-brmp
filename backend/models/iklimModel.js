const mongoose = require("mongoose");

const iklimSchema = new mongoose.Schema({
  NAMA_STASIUN: { type: String, required: true, trim: true },
  TANGGAL: { type: Date, required: true },
  TN: Number,
  TX: Number,
  TM: Number,
  UN: Number,
  UX: Number,
  UM: Number,
  RR: Number,
  GIX: Number,
  VT: Number,
  RG: Number,
}, { timestamps: true });

// Satu stasiun hanya boleh punya satu baris per tanggal.
// Ini yang menjamin dedup di level database, bukan sekadar di kode.
iklimSchema.index({ NAMA_STASIUN: 1, TANGGAL: 1 }, { unique: true });

module.exports = mongoose.model("Iklim", iklimSchema);
