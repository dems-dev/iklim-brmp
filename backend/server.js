require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Diperiksa SEBELUM app dimuat, supaya konfigurasi produksi yang bermasalah
// menghentikan server alih-alih menyala dengan celah terbuka.
const { periksaKonfigurasi } = require('./lib/periksaKonfigurasi');
periksaKonfigurasi();

const app = require('./app');

const { hubungkanDB } = require('./lib/mongoose');

hubungkanDB()
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server berjalan di port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Gagal terhubung ke database:', err.message);
    process.exit(1);
  });
