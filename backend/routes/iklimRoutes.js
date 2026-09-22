const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/auth");
const controller = require("../controllers/iklimController");

router.use(auth); // semua route di bawah wajib login

// Baca, semua user yang sudah login
router.get("/search", controller.searchData);
router.get("/stations", controller.getStationNames);
router.get("/statistics", controller.getStatistics);
router.get("/validasi/rentang", controller.getRentangValidasi);
router.get("/validasi/audit", controller.auditKualitas);
router.get("/export/excel", controller.exportExcel);
router.get("/export/pdf", controller.exportPDF);

// Tulis, hanya admin
router.post("/upload", requireRole("admin"), controller.uploadExcel);

module.exports = router;
