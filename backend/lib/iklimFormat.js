// Definisi variabel iklim, satu sumber kebenaran untuk export Excel & PDF.
const VARIABEL = [
  { key: 'TN',  label: 'Suhu Minimum Harian',                unit: '°C' },
  { key: 'TX',  label: 'Suhu Maksimum Harian',               unit: '°C' },
  { key: 'TM',  label: 'Suhu Rata-rata Harian',              unit: '°C' },
  { key: 'UN',  label: 'Kelembapan Minimum',                 unit: '%' },
  { key: 'UX',  label: 'Kelembapan Maksimum',                unit: '%' },
  { key: 'UM',  label: 'Kelembapan Rata-rata',               unit: '%' },
  { key: 'RR',  label: 'Curah Hujan',                        unit: 'mm' },
  { key: 'GIX', label: 'Arah Angin Saat Kecepatan Maksimum', unit: '°' },
  { key: 'VT',  label: 'Kecepatan Angin Rata-rata',          unit: 'm/s' },
  { key: 'RG',  label: 'Radiasi Global',                     unit: 'W/m²' },
];

const KODE_FIELD = VARIABEL.map(v => v.key);

// Kode khusus pengukuran AWS
const KODE_KHUSUS = {
  8888: { teks: 'Tidak Terukur',  ringkas: '8888*', argb: 'FFFF8C00', hex: '#FF8C00' },
  9999: { teks: 'Tidak Ada Data', ringkas: '9999*', argb: 'FFFF0000', hex: '#FF0000' },
};

const KETERANGAN_VARIABEL = [
  'KETERANGAN VARIABEL:',
  ...VARIABEL.map(v => `${v.key.padEnd(3)} : ${v.label} (${v.unit})`),
];

const KETERANGAN_KODE = [
  'KETERANGAN KODE KHUSUS:',
  '8888 : Data tidak terukur',
  '9999 : Tidak ada data (tidak dilakukan pengukuran)',
];

// Format satu nilai jadi teks ringkas (dipakai PDF)
const formatRingkas = (value) => {
  const khusus = KODE_KHUSUS[value];
  if (khusus) return khusus.ringkas;
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(1);
};

const KOP_SURAT = [
  { teks: 'KEMENTERIAN PERTANIAN', size: 14, bold: true },
  { teks: 'BADAN PERAKITAN DAN MODERNISASI PERTANIAN', size: 12, bold: true },
  { teks: 'BALAI BESAR PERAKITAN DAN MODERNISASI SUMBER DAYA LAHAN PERTANIAN', size: 11, bold: true },
  { teks: 'BALAI PERAKITAN DAN PENGUJIAN AGROKLIMAT DAN HIDROLOGI PERTANIAN', size: 11, bold: true },
  { teks: 'JALAN TENTARA PELAJAR NOMOR 1A, CIMANGGU BOGOR 16111', size: 10, bold: false },
  { teks: 'TELEPON (0251) 8312760, FAKSIMILI (0251) 8323909', size: 10, bold: false },
  { teks: 'WEBSITE: agroklimat.brmp.pertanian.go.id EMAIL: brmp.agroklimat@pertanian.go.id', size: 10, bold: false },
];

module.exports = {
  VARIABEL, KODE_FIELD, KODE_KHUSUS,
  KETERANGAN_VARIABEL, KETERANGAN_KODE,
  formatRingkas, KOP_SURAT,
};
