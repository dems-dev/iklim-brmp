/**
 * Validasi rentang wajar per variabel iklim.
 *
 * Dua lapis batas untuk tiap variabel:
 *   - `batas` : batas fisik/absolut. Di luar ini nilainya mustahil, jadi
 *               dilaporkan sebagai ERROR.
 *   - `wajar` : rentang yang lazim ditemui di stasiun AWS Indonesia. Nilai
 *               di antara `wajar` dan `batas` masih mungkin tapi patut
 *               dicurigai, jadi dilaporkan sebagai PERINGATAN.
 *
 * Angka `wajar` dikalibrasi terhadap 286 data yang sudah ada di database
 * (stasiun Pacet dan Muara) dengan kelonggaran, supaya data normal tidak
 * membanjiri operator dengan peringatan palsu.
 *
 * Kode khusus 8888 (tidak terukur) dan 9999 (tidak ada data) selalu
 * dikecualikan dari semua pemeriksaan.
 */

const { KODE_KHUSUS } = require("./iklimFormat");

const RENTANG = {
  TN: {
    label: "Suhu Minimum Harian",
    satuan: "°C",
    batas: { min: -10, max: 45 },
    wajar: { min: 5, max: 32 },
  },
  TX: {
    label: "Suhu Maksimum Harian",
    satuan: "°C",
    batas: { min: -5, max: 50 },
    wajar: { min: 12, max: 42 },
  },
  TM: {
    label: "Suhu Rata-rata Harian",
    satuan: "°C",
    batas: { min: -5, max: 45 },
    wajar: { min: 8, max: 38 },
  },

  // Kelembapan relatif tidak bisa melebihi 100%. Sensor AWS yang jenuh
  // umum membaca sedikit di atas 100 karena drift kalibrasi, jadi 100-105
  // dianggap peringatan (perlu kalibrasi ulang), di atas 105 dianggap error.
  UN: {
    label: "Kelembapan Minimum",
    satuan: "%",
    batas: { min: 0, max: 105 },
    wajar: { min: 0, max: 100 },
  },
  UX: {
    label: "Kelembapan Maksimum",
    satuan: "%",
    batas: { min: 0, max: 105 },
    wajar: { min: 0, max: 100 },
  },
  UM: {
    label: "Kelembapan Rata-rata",
    satuan: "%",
    batas: { min: 0, max: 105 },
    wajar: { min: 0, max: 100 },
  },

  RR: {
    label: "Curah Hujan",
    satuan: "mm",
    batas: { min: 0, max: 500 },
    wajar: { min: 0, max: 200 },
  },

  GIX: {
    label: "Arah Angin Saat Kecepatan Maksimum",
    satuan: "°",
    batas: { min: 0, max: 360 },
    wajar: { min: 0, max: 360 },
  },

  // CATATAN UNIT: data yang ada berkisar 0-265 dengan median 21. Kalau
  // satuannya benar-benar m/s, nilai segitu mustahil (265 m/s = 954 km/jam).
  // Angka ini lebih cocok dibaca sebagai wind run (km/hari). Batas di bawah
  // mengikuti data yang ada; perbaiki setelah satuan dipastikan ke BMKG.
  VT: {
    label: "Kecepatan Angin Rata-rata",
    satuan: "m/s (perlu konfirmasi)",
    batas: { min: 0, max: 500 },
    wajar: { min: 0, max: 300 },
    catatanUnit: true,
  },

  // CATATAN UNIT: data berkisar 272-2001 dengan median 996. Sebagai
  // irradiance (W/m²) nilai di atas 1361 melampaui konstanta surya, jadi
  // mustahil. Lebih cocok dibaca sebagai total radiasi harian (J/cm²/hari,
  // yang setara ~20 MJ/m²/hari untuk nilai 2001, khas daerah tropis).
  RG: {
    label: "Radiasi Global",
    satuan: "W/m² (perlu konfirmasi)",
    batas: { min: 0, max: 4000 },
    wajar: { min: 0, max: 2500 },
    catatanUnit: true,
  },
};

// Pemeriksaan antar-kolom. Melanggar ini hampir selalu berarti kolom
// tertukar saat penyusunan file, bukan cuaca yang aneh.
// Diverifikasi: nol pelanggaran pada 286 data yang sudah ada.
const KONSISTENSI = [
  {
    field: ["TN", "TM"],
    uji: (r) => r.TN <= r.TM,
    pesan: "Suhu minimum (TN) lebih besar dari suhu rata-rata (TM)",
  },
  {
    field: ["TM", "TX"],
    uji: (r) => r.TM <= r.TX,
    pesan: "Suhu rata-rata (TM) lebih besar dari suhu maksimum (TX)",
  },
  {
    field: ["UN", "UM"],
    uji: (r) => r.UN <= r.UM,
    pesan: "Kelembapan minimum (UN) lebih besar dari kelembapan rata-rata (UM)",
  },
  {
    field: ["UM", "UX"],
    uji: (r) => r.UM <= r.UX,
    pesan: "Kelembapan rata-rata (UM) lebih besar dari kelembapan maksimum (UX)",
  },
];

const adalahKodeKhusus = (v) => Object.keys(KODE_KHUSUS).includes(String(v));

// Nilai yang tidak ikut diperiksa: kosong atau kode khusus
const perluDiperiksa = (v) =>
  v !== null && v !== undefined && !adalahKodeKhusus(v);

/**
 * Periksa satu baris data.
 * @returns {Array<{field, nilai, tingkat, pesan}>} daftar temuan (kosong bila bersih)
 */
const periksaBaris = (entri) => {
  const temuan = [];

  // 1. Rentang per variabel
  for (const [field, def] of Object.entries(RENTANG)) {
    const nilai = entri[field];
    if (!perluDiperiksa(nilai)) continue;

    if (nilai < def.batas.min || nilai > def.batas.max) {
      temuan.push({
        field,
        nilai,
        tingkat: "error",
        pesan: `${def.label} = ${nilai}${def.satuan.startsWith("%") ? "%" : " " + def.satuan} di luar batas fisik (${def.batas.min} s/d ${def.batas.max})`,
      });
    } else if (nilai < def.wajar.min || nilai > def.wajar.max) {
      temuan.push({
        field,
        nilai,
        tingkat: "peringatan",
        pesan: `${def.label} = ${nilai} di luar rentang wajar (${def.wajar.min} s/d ${def.wajar.max}), periksa kalibrasi sensor`,
      });
    }
  }

  // 2. Konsistensi antar-kolom
  for (const aturan of KONSISTENSI) {
    const semuaAda = aturan.field.every((f) => perluDiperiksa(entri[f]));
    if (!semuaAda) continue;

    if (!aturan.uji(entri)) {
      temuan.push({
        field: aturan.field.join("/"),
        nilai: aturan.field.map((f) => `${f}=${entri[f]}`).join(", "),
        tingkat: "error",
        pesan: aturan.pesan + ", kemungkinan kolom tertukar",
      });
    }
  }

  return temuan;
};

/**
 * Periksa sekumpulan baris.
 * @param {Array} entriList hasil parsing, harus punya properti `_baris`
 * @returns {{temuan: Array, jumlahError: number, jumlahPeringatan: number}}
 */
const periksaSemua = (entriList) => {
  const temuan = [];

  entriList.forEach((entri) => {
    periksaBaris(entri).forEach((t) => {
      temuan.push({ baris: entri._baris, ...t });
    });
  });

  return {
    temuan,
    jumlahError: temuan.filter((t) => t.tingkat === "error").length,
    jumlahPeringatan: temuan.filter((t) => t.tingkat === "peringatan").length,
  };
};

module.exports = { RENTANG, KONSISTENSI, periksaBaris, periksaSemua };
