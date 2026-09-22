const Iklim = require("../models/iklimModel");
const multer = require("multer");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const {
  KODE_FIELD, KODE_KHUSUS,
  KETERANGAN_VARIABEL, KETERANGAN_KODE,
  formatRingkas, KOP_SURAT,
} = require("../lib/iklimFormat");
const { periksaSemua, periksaBaris, RENTANG } = require("../lib/validasiIklim");

const STASIUN_VALID = [
  "AWS KP PACET",
  "AWS KP PAKUWON",
  "AWS KP CIMANGGU",
  "AWS KP MUARA",
];

// ---------------------------------------------------------------- helpers

// Konversi Excel serial date ke JavaScript Date
const excelDateToJSDate = (serial) => {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(excelEpoch.getTime() + serial * 86400 * 1000);
};

// Kembalikan Date valid, atau null kalau tidak bisa diparse.
// Sengaja TIDAK ada fallback ke tanggal hari ini, fallback semacam itu
// menyuntikkan baris sampah ke database tanpa ada yang sadar.
const parseTanggal = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;

  let d;
  if (raw instanceof Date) d = raw;
  else if (typeof raw === "number") d = excelDateToJSDate(raw);
  else if (typeof raw === "string") d = new Date(raw);
  else return null;

  if (isNaN(d.getTime())) return null;

  // Normalisasi ke tengah malam UTC supaya satu hari = satu baris,
  // apa pun komponen jam yang terbawa dari Excel.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const parseAngka = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuery = ({ startDate, endDate, stasiun }) => {
  const query = {};

  if (startDate || endDate) {
    query.TANGGAL = {};
    if (startDate) query.TANGGAL.$gte = new Date(startDate + "T00:00:00.000Z");
    if (endDate) query.TANGGAL.$lte = new Date(endDate + "T23:59:59.999Z");
  }

  if (stasiun) {
    // Escape dulu agar input user tidak bisa jadi pola regex liar
    query.NAMA_STASIUN = { $regex: new RegExp(escapeRegex(stasiun), "i") };
  }

  return query;
};

const tanggalIndonesia = () =>
  new Date().toLocaleString("id-ID", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });

// ---------------------------------------------------------------- upload

// File Excel diproses di memori, tidak menyentuh disk sama sekali,
// sehingga tidak ada file sisa yang menumpuk di backend/file/.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Cek ekstensi, bukan hanya mimetype: sebagian browser dan OS
    // mengirim .xlsx sebagai application/octet-stream sehingga file yang
    // sah ikut tertolak. Isi file tetap divalidasi saat diparse xlsx.
    const ekstensiOk = /\.(xlsx|xls)$/i.test(file.originalname);
    const mimeOk = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ].includes(file.mimetype);

    const ok = ekstensiOk && mimeOk;
    cb(ok ? null : new Error("Hanya file Excel (.xls/.xlsx) yang diizinkan"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

exports.uploadExcel = [
  (req, res, next) =>
    upload.single("file")(req, res, (err) =>
      err ? res.status(400).json({ error: err.message }) : next()
    ),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File tidak ditemukan" });
      }
      if (!req.body.station) {
        return res.status(400).json({ error: "Nama stasiun wajib dipilih" });
      }

      const namaStasiun = req.body.station.trim().toUpperCase();
      if (!STASIUN_VALID.includes(namaStasiun)) {
        return res.status(400).json({
          error: `Stasiun tidak dikenal: ${req.body.station}`,
          stasiunValid: STASIUN_VALID,
        });
      }

      const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res.status(400).json({ error: "File Excel tidak mengandung data" });
      }

      const wajib = ["Date", "TN", "TX", "TM"];
      const hilang = wajib.filter((c) => !(c in rows[0]));
      if (hilang.length) {
        return res.status(400).json({
          error: `Kolom wajib tidak ditemukan: ${hilang.join(", ")}`,
          kolomYangDitemukan: Object.keys(rows[0]),
        });
      }

      // Pisahkan baris valid dari yang tanggalnya rusak, lalu laporkan
      // keduanya. Baris rusak dilewati, bukan ditambal.
      const valid = [];
      const dilewati = [];

      rows.forEach((row, i) => {
        const tanggal = parseTanggal(row["Date"]);
        if (!tanggal) {
          dilewati.push({
            baris: i + 2,
            alasan: "Tanggal tidak valid",
            nilai: String(row["Date"]),
          });
          return;
        }
        const entri = { NAMA_STASIUN: namaStasiun, TANGGAL: tanggal, _baris: i + 2 };
        KODE_FIELD.forEach((k) => { entri[k] = parseAngka(row[k]); });
        valid.push(entri);
      });

      if (!valid.length) {
        return res.status(400).json({
          error: "Tidak ada baris dengan tanggal yang valid",
          barisDilewati: dilewati.slice(0, 20),
          totalDilewati: dilewati.length,
        });
      }

      // Validasi rentang wajar per variabel + konsistensi antar-kolom.
      const validasi = periksaSemua(valid);

      // Mode ketat: batalkan seluruh upload kalau ada nilai mustahil,
      // supaya operator memperbaiki file sumbernya dulu. Tanpa mode ini
      // data tetap disimpan apa adanya (rekaman pengukuran tidak dibuang)
      // dan temuannya dilaporkan ke operator.
      const modeKetat = req.body.strict === "true" || req.body.strict === true;
      if (modeKetat && validasi.jumlahError > 0) {
        return res.status(400).json({
          error: `Upload dibatalkan (mode ketat): ${validasi.jumlahError} nilai di luar batas fisik`,
          validasi: {
            jumlahError: validasi.jumlahError,
            jumlahPeringatan: validasi.jumlahPeringatan,
            temuan: validasi.temuan.slice(0, 50),
          },
        });
      }

      // Upsert per (stasiun, tanggal): data baru masuk, data lama diperbarui.
      // Ini menggantikan filter "TANGGAL > tanggal terakhir" yang diam-diam
      // membuang seluruh data historis.
      const hasil = await Iklim.bulkWrite(
        valid.map(({ _baris, ...e }) => ({
          updateOne: {
            filter: { NAMA_STASIUN: e.NAMA_STASIUN, TANGGAL: e.TANGGAL },
            update: { $set: e },
            upsert: true,
          },
        })),
        { ordered: false }
      );

      const waktu = valid.map((e) => e.TANGGAL.getTime());
      const ditambah = hasil.upsertedCount || 0;
      const diperbarui = hasil.modifiedCount || 0;

      res.status(200).json({
        message: `Upload berhasil. ${ditambah} data baru, ${diperbarui} data diperbarui.`,
        stasiun: namaStasiun,
        tanggalUpload: tanggalIndonesia(),
        rentangData: {
          dari: new Date(Math.min(...waktu)).toLocaleDateString("id-ID"),
          sampai: new Date(Math.max(...waktu)).toLocaleDateString("id-ID"),
        },
        ringkasan: {
          totalBaris: rows.length,
          diproses: valid.length,
          ditambah,
          diperbarui,
          dilewati: dilewati.length,
        },
        barisDilewati: dilewati.slice(0, 20),
        validasi: {
          jumlahError: validasi.jumlahError,
          jumlahPeringatan: validasi.jumlahPeringatan,
          temuan: validasi.temuan.slice(0, 50),
          adaLagi: Math.max(0, validasi.temuan.length - 50),
        },
      });
    } catch (error) {
      console.error("[upload]", error);
      res.status(500).json({ error: "Gagal memproses file: " + error.message });
    }
  },
];

// ---------------------------------------------------------------- search

exports.searchData = async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 10));

    const [data, total] = await Promise.all([
      Iklim.find(query)
        .sort({ TANGGAL: -1, NAMA_STASIUN: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Iklim.countDocuments(query),
    ]);

    res.json({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      infoDownload: {
        tanggalDownload: tanggalIndonesia(),
        totalData: data.length,
        totalAllData: total,
      },
    });
  } catch (error) {
    console.error("[search]", error);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
};

// ---------------------------------------------------------------- export Excel

exports.exportExcel = async (req, res) => {
  try {
    const { startDate, endDate, stasiun } = req.query;
    const limit = Math.min(50000, Number(req.query.limit) || 10000);

    const data = await Iklim.find(buildQuery(req.query))
      .sort({ TANGGAL: 1, NAMA_STASIUN: 1 })
      .limit(limit)
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Iklim");

    // Lebar kolom di-set lewat getColumn().width saja.
    // Memakai worksheet.columns dengan properti `header` akan menulis
    // baris header di row 1 dan menimpa kop surat.
    const lebar = [8, 15, 25, ...KODE_FIELD.map(() => 12)];
    lebar.forEach((w, i) => { worksheet.getColumn(i + 1).width = w; });

    // ---- Kop surat (row 1-7)
    KOP_SURAT.forEach((baris, i) => {
      const r = i + 1;
      worksheet.getRow(r).height = i < 4 ? 22 : 18;
      worksheet.mergeCells(`A${r}:M${r}`);
      const cell = worksheet.getCell(`A${r}`);
      cell.value = baris.teks;
      cell.font = { bold: baris.bold, size: baris.size, name: "Arial" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    worksheet.mergeCells("A8:M8");
    worksheet.getCell("A8").border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
    };

    // ---- Judul & info filter
    worksheet.mergeCells("A9:M9");
    const judul = worksheet.getCell("A9");
    judul.value = "LAPORAN DATA IKLIM";
    judul.font = { bold: true, size: 14, name: "Arial" };
    judul.alignment = { horizontal: "center", vertical: "middle" };
    judul.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F3FF" } };

    worksheet.mergeCells("A10:M10");
    const filter = worksheet.getCell("A10");
    filter.value = `Stasiun: ${stasiun || "Semua Stasiun"} | Periode: ${startDate || "Awal"} - ${endDate || "Akhir"}`;
    filter.font = { size: 10, name: "Arial" };
    filter.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A11:M11");
    const unduh = worksheet.getCell("A11");
    unduh.value = `Diunduh pada: ${tanggalIndonesia()}`;
    unduh.font = { size: 9, italic: true, name: "Arial" };
    unduh.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.getRow(12).height = 5;

    // ---- Header tabel (row 13)
    const headerRow = worksheet.getRow(13);
    headerRow.values = ["No", "Tanggal", "Stasiun", ...KODE_FIELD];
    headerRow.font = { bold: true, size: 10, name: "Arial", color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E8B57" } };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    });
    headerRow.commit();

    // ---- Baris data
    data.forEach((item, index) => {
      const row = worksheet.getRow(14 + index);
      row.getCell(1).value = index + 1;
      row.getCell(2).value = item.TANGGAL;
      row.getCell(3).value = item.NAMA_STASIUN;

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).numFmt = "dd-mm-yyyy";
      row.getCell(2).alignment = { horizontal: "center" };

      KODE_FIELD.forEach((key, i) => {
        const cell = row.getCell(4 + i);
        const value = item[key];
        const khusus = KODE_KHUSUS[value];

        if (khusus) {
          cell.value = `${value} (${khusus.teks})`;
          cell.font = { color: { argb: khusus.argb }, italic: true };
          cell.alignment = { horizontal: "center" };
        } else if (value !== null && value !== undefined) {
          cell.value = value;
          cell.numFmt = "0.00";
          cell.alignment = { horizontal: "right" };
        } else {
          cell.value = "-";
          cell.alignment = { horizontal: "center" };
        }
      });

      const warnaSelang = index % 2 === 0
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F8FF" } }
        : null;

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" },
        };
        if (warnaSelang) cell.fill = warnaSelang;
      });
      row.commit();
    });

    worksheet.autoFilter = "A13:M13";

    // ---- Footer & keterangan
    let baris = 14 + data.length + 2;

    const total = worksheet.getCell(`A${baris}`);
    total.value = `Total Data: ${data.length} records`;
    total.font = { bold: true, size: 10, name: "Arial" };
    baris += 2;

    [...KETERANGAN_VARIABEL, "", ...KETERANGAN_KODE].forEach((teks, i) => {
      const cell = worksheet.getCell(`A${baris + i}`);
      cell.value = teks;
      const isJudul = teks.endsWith(":");
      const khusus = teks.startsWith("8888") ? KODE_KHUSUS[8888]
                   : teks.startsWith("9999") ? KODE_KHUSUS[9999]
                   : null;
      cell.font = {
        bold: isJudul,
        size: isJudul ? 10 : 9,
        name: "Arial",
        ...(khusus ? { color: { argb: khusus.argb } } : {}),
      };
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="LAPORAN_DATA_IKLIM_${Date.now()}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[exportExcel]", error);
    if (!res.headersSent) res.status(500).json({ error: "Gagal mengekspor Excel" });
    else res.end();
  }
};

// ---------------------------------------------------------------- export PDF

exports.exportPDF = async (req, res) => {
  try {
    const { startDate, endDate, stasiun } = req.query;

    const data = await Iklim.find(buildQuery(req.query))
      .sort({ TANGGAL: 1, NAMA_STASIUN: 1 })
      .lean();

    if (!data.length) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const doc = new PDFDocument({
      size: "A4", margin: 15, bufferPages: true, layout: "portrait",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="LAPORAN_DATA_IKLIM_${Date.now()}.pdf"`
    );
    doc.pipe(res);

    // ---- Kop surat
    const lebarHalaman = doc.page.width - 30;
    let y = 15;
    KOP_SURAT.slice(0, 5).forEach((baris, i) => {
      doc.fontSize(i === 0 ? 11 : i < 4 ? 9 : 7)
         .font(baris.bold ? "Helvetica-Bold" : "Helvetica")
         .text(baris.teks, 15, y, { width: lebarHalaman, align: "center" });
      y += 13;
    });

    doc.moveTo(15, 80).lineTo(doc.page.width - 15, 80).lineWidth(1).stroke();

    doc.fontSize(13).font("Helvetica-Bold")
       .text("LAPORAN DATA IKLIM", 15, 85, { width: lebarHalaman, align: "center" });

    doc.fontSize(8).font("Helvetica")
       .text(
         `Stasiun: ${stasiun || "Semua Stasiun"} | Periode: ${startDate || "Awal"} - ${endDate || "Akhir"}`,
         15, 100, { width: lebarHalaman, align: "center" }
       )
       .text(
         `Diunduh: ${new Date().toLocaleDateString("id-ID")}`,
         15, 112, { width: lebarHalaman, align: "center" }
       );

    // ---- Tabel
    const headers = ["No", "Tanggal", "Stasiun", ...KODE_FIELD];
    // Total 563pt, muat di lebar cetak A4 portrait (565pt dengan margin 15)
    const colWidths = [22, 45, 66, ...KODE_FIELD.map(() => 43)];
    const startX = 15;
    const rowHeight = 15;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    let yPos = 130;

    const gambarHeader = () => {
      doc.rect(startX, yPos, tableWidth, rowHeight).fillColor("#2E8B57").fill();
      doc.fontSize(6).font("Helvetica-Bold").fillColor("white");
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(h, x + 1, yPos + 4, { width: colWidths[i] - 2, align: "center" });
        x += colWidths[i];
      });
      yPos += rowHeight;
      doc.fillColor("black");
    };

    gambarHeader();

    data.forEach((item, index) => {
      if (yPos + rowHeight > doc.page.height - 40) {
        doc.addPage();
        doc.fontSize(10).font("Helvetica-Bold").fillColor("black")
           .text("LAPORAN DATA IKLIM (Lanjutan)", 15, 20, {
             width: lebarHalaman, align: "center",
           });
        yPos = 40;
        gambarHeader();
      }

      if (index % 2 === 0) {
        doc.rect(startX, yPos, tableWidth, rowHeight).fillColor("#F8F9FA").fill();
      }

      const row = [
        String(index + 1),
        new Date(item.TANGGAL).toLocaleDateString("id-ID"),
        item.NAMA_STASIUN,
        ...KODE_FIELD.map((k) => formatRingkas(item[k])),
      ];

      doc.fontSize(5).font("Helvetica");
      let x = startX;
      row.forEach((cell, i) => {
        doc.fillColor("black").rect(x, yPos, colWidths[i], rowHeight).stroke();

        const khusus = Object.values(KODE_KHUSUS).find((k) => k.ringkas === cell);
        doc.fillColor(khusus ? khusus.hex : "black");
        doc.text(cell, x + 1, yPos + 4, {
          width: colWidths[i] - 2,
          align: i === 2 ? "left" : "center",
        });

        x += colWidths[i];
      });
      doc.fillColor("black");
      yPos += rowHeight;
    });

    // ---- Keterangan di akhir
    let footerY = yPos + 12;
    const tinggiKeterangan =
      (KETERANGAN_VARIABEL.length + KETERANGAN_KODE.length + 3) * 9 + 20;

    if (footerY + tinggiKeterangan > doc.page.height - 30) {
      doc.addPage();
      footerY = 30;
    }

    doc.fontSize(8).font("Helvetica-Bold").fillColor("black")
       .text(`Total Data: ${data.length} records`, 15, footerY);
    footerY += 14;

    [...KETERANGAN_VARIABEL, "", ...KETERANGAN_KODE].forEach((teks) => {
      if (!teks) { footerY += 5; return; }
      const isJudul = teks.endsWith(":");
      const khusus = teks.startsWith("8888") ? KODE_KHUSUS[8888]
                   : teks.startsWith("9999") ? KODE_KHUSUS[9999]
                   : null;
      doc.font(isJudul ? "Helvetica-Bold" : "Helvetica")
         .fontSize(isJudul ? 8 : 7)
         .fillColor(khusus ? khusus.hex : "black")
         .text(teks, 15, footerY);
      footerY += 9;
    });

    doc.fillColor("black");
    doc.end();
  } catch (error) {
    console.error("[exportPDF]", error);
    if (!res.headersSent) res.status(500).json({ error: "Gagal mengekspor PDF" });
    else res.end();
  }
};

// ---------------------------------------------------------------- lain-lain

exports.getStationNames = async (req, res) => {
  try {
    const stations = await Iklim.distinct("NAMA_STASIUN");
    res.status(200).json({
      stations: stations.sort(),
      info: {
        lastUpdated: tanggalIndonesia(),
        totalStations: stations.length,
      },
    });
  } catch (error) {
    console.error("[stations]", error);
    res.status(500).json({ error: "Gagal mengambil daftar stasiun" });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const stats = await Iklim.aggregate([
      { $match: buildQuery(req.query) },
      {
        $group: {
          _id: "$NAMA_STASIUN",
          totalRecords: { $sum: 1 },
          startDate: { $min: "$TANGGAL" },
          endDate: { $max: "$TANGGAL" },
          lastUpdate: { $max: "$updatedAt" },
        },
      },
      {
        $project: {
          _id: 0,
          stasiun: "$_id",
          totalRecords: 1,
          startDate: 1,
          endDate: 1,
          lastUpdate: 1,
        },
      },
      { $sort: { stasiun: 1 } },
    ]);

    res.status(200).json({
      statistics: stats,
      summary: {
        totalStations: stats.length,
        totalAllRecords: stats.reduce((s, x) => s + x.totalRecords, 0),
        lastUpdated: tanggalIndonesia(),
      },
    });
  } catch (error) {
    console.error("[statistics]", error);
    res.status(500).json({ error: "Gagal mengambil statistik" });
  }
};

// Audit mutu data yang SUDAH tersimpan di database. Berguna untuk memeriksa
// data lama yang masuk sebelum validasi ini ada.
exports.auditKualitas = async (req, res) => {
  try {
    const data = await Iklim.find(buildQuery(req.query))
      .sort({ TANGGAL: 1, NAMA_STASIUN: 1 })
      .lean();

    const temuan = [];
    data.forEach((doc) => {
      periksaBaris(doc).forEach((t) => {
        temuan.push({
          tanggal: new Date(doc.TANGGAL).toISOString().slice(0, 10),
          stasiun: doc.NAMA_STASIUN,
          ...t,
        });
      });
    });

    const perVariabel = {};
    temuan.forEach((t) => {
      perVariabel[t.field] = (perVariabel[t.field] || 0) + 1;
    });

    res.status(200).json({
      ringkasan: {
        dataDiperiksa: data.length,
        totalTemuan: temuan.length,
        jumlahError: temuan.filter((t) => t.tingkat === "error").length,
        jumlahPeringatan: temuan.filter((t) => t.tingkat === "peringatan").length,
        perVariabel,
      },
      temuan: temuan.slice(0, 200),
      adaLagi: Math.max(0, temuan.length - 200),
      diperiksaPada: tanggalIndonesia(),
    });
  } catch (error) {
    console.error("[auditKualitas]", error);
    res.status(500).json({ error: "Gagal memeriksa kualitas data" });
  }
};

// Rentang yang dipakai validator, dipakai frontend untuk menampilkan
// batas ke operator tanpa menyalin angkanya di dua tempat.
exports.getRentangValidasi = (req, res) => {
  res.status(200).json({ rentang: RENTANG });
};
