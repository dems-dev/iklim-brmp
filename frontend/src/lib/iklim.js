/* ==========================================================================
   Definisi variabel iklim, satu sumber kebenaran untuk seluruh frontend.
   Mencerminkan backend/lib/iklimFormat.js.
   ========================================================================== */

export const VARIABEL = [
  { key: "TN", nama: "Suhu Minimum Harian", singkat: "Suhu min", satuan: "°C" },
  { key: "TX", nama: "Suhu Maksimum Harian", singkat: "Suhu maks", satuan: "°C" },
  { key: "TM", nama: "Suhu Rata-rata Harian", singkat: "Suhu rata²", satuan: "°C" },
  { key: "UN", nama: "Kelembapan Minimum", singkat: "Lembap min", satuan: "%" },
  { key: "UX", nama: "Kelembapan Maksimum", singkat: "Lembap maks", satuan: "%" },
  { key: "UM", nama: "Kelembapan Rata-rata", singkat: "Lembap rata²", satuan: "%" },
  { key: "RR", nama: "Curah Hujan", singkat: "Curah hujan", satuan: "mm" },
  { key: "GIX", nama: "Arah Angin Saat Kecepatan Maksimum", singkat: "Arah angin", satuan: "°" },
  { key: "VT", nama: "Kecepatan Angin Rata-rata", singkat: "Kecepatan angin", satuan: "" },
  { key: "RG", nama: "Radiasi Global", singkat: "Radiasi global", satuan: "" },
];

export const KODE_FIELD = VARIABEL.map((v) => v.key);
export const byKey = Object.fromEntries(VARIABEL.map((v) => [v.key, v]));

/* Kode khusus pengukuran AWS */
export const KODE_KHUSUS = {
  8888: { teks: "Tidak terukur", tone: "warn" },
  9999: { teks: "Tidak ada data", tone: "crit" },
};

/** Format satu nilai untuk ditampilkan, termasuk penanganan kode khusus. */
export function formatNilai(v, desimal = 1) {
  if (v === null || v === undefined || v === "") {
    return { teks: "–", khusus: false, tone: null };
  }
  const khusus = KODE_KHUSUS[v];
  if (khusus) {
    return { teks: String(v), khusus: true, tone: khusus.tone, judul: khusus.teks };
  }
  return {
    teks: Number(v).toLocaleString("id-ID", {
      minimumFractionDigits: desimal,
      maximumFractionDigits: desimal,
    }),
    khusus: false,
    tone: null,
  };
}

export const angka = (v, d = 1) =>
  v === null || v === undefined
    ? "–"
    : Number(v).toLocaleString("id-ID", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

export const tanggalPendek = (t) =>
  new Date(t).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

export const tanggalPanjang = (t) =>
  new Date(t).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Ubah hasil API jadi bentuk siap grafik, urut menaik menurut tanggal. */
export function siapkanGrafik(rows) {
  return [...rows]
    .sort((a, b) => new Date(a.TANGGAL) - new Date(b.TANGGAL))
    .map((r) => {
      const d = { label: tanggalPendek(r.TANGGAL), TANGGAL: r.TANGGAL };
      // Kode khusus dikeluarkan dari grafik, 9999 akan merusak skala sumbu
      KODE_FIELD.forEach((k) => {
        const v = r[k];
        d[k] = v === 8888 || v === 9999 || v === null ? null : v;
      });
      return d;
    });
}

/** Ringkasan sederhana untuk tile statistik. */
export function ringkas(rows, field) {
  const v = rows
    .map((r) => r[field])
    .filter((x) => x !== null && x !== undefined && x !== 8888 && x !== 9999);
  if (!v.length) return { rata: null, min: null, maks: null, total: null, n: 0 };
  const total = v.reduce((s, x) => s + x, 0);
  return {
    rata: total / v.length,
    min: Math.min(...v),
    maks: Math.max(...v),
    total,
    n: v.length,
  };
}
