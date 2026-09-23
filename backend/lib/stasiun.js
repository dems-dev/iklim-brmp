const Stasiun = require("../models/stasiunModel");
const Iklim = require("../models/iklimModel");

// Stasiun AWS milik Balai, selalu terdaftar walau belum punya data ataupun
// dokumen di koleksi Stasiun.
const STASIUN_BAWAAN = [
  { NAMA: "AWS KP PACET", LABEL: "AWS KP Pacet", WILAYAH: "Cianjur" },
  { NAMA: "AWS KP MUARA", LABEL: "AWS KP Muara", WILAYAH: "Bogor" },
  { NAMA: "AWS KP PAKUWON", LABEL: "AWS KP Pakuwon", WILAYAH: "Sukabumi" },
  { NAMA: "AWS KP CIMANGGU", LABEL: "AWS KP Cimanggu", WILAYAH: "Bogor" },
];

// Nama stasiun disimpan dalam huruf kapital supaya "AWS KP Pacet" dan
// "AWS KP PACET" tidak menjadi dua stasiun berbeda.
const normalisasiNama = (nama) =>
  String(nama ?? "").trim().replace(/\s+/g, " ").toUpperCase();

// Gabungan stasiun bawaan, registri, dan nama yang hanya muncul di data lama.
// Dokumen registri menimpa entri bawaan dengan nama yang sama.
const daftarStasiun = async () => {
  const [registri, namaDiData] = await Promise.all([
    Stasiun.find().lean(),
    Iklim.distinct("NAMA_STASIUN"),
  ]);

  const peta = new Map();
  STASIUN_BAWAAN.forEach((s) => peta.set(s.NAMA, { ...s }));
  registri.forEach(({ _id, __v, createdAt, updatedAt, ...s }) =>
    peta.set(s.NAMA, { ...peta.get(s.NAMA), ...s })
  );
  namaDiData.forEach((nama) => {
    if (!peta.has(nama)) peta.set(nama, { NAMA: nama, LABEL: nama });
  });

  return [...peta.values()].sort((a, b) => a.NAMA.localeCompare(b.NAMA));
};

module.exports = { STASIUN_BAWAAN, normalisasiNama, daftarStasiun };
