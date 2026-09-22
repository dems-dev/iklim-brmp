import axios from "axios";

// Base URL. Di produksi frontend dan API berbagi domain yang sama, jadi
// jalur relatif "/api" sudah benar tanpa perlu diatur. VITE_API_URL hanya
// diperlukan bila backend berada di domain lain.
const lokal =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

const baseURL =
  import.meta.env.VITE_API_URL || (lokal ? "http://localhost:5000/api" : "/api");

const api = axios.create({ baseURL });

// Sisipkan token otomatis di setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token kedaluwarsa / tidak valid -> bersihkan sesi dan kembali ke login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Ambil pesan error yang layak ditampilkan ke pengguna
export const pesanError = (error, fallback = "Terjadi kesalahan") =>
  error.response?.data?.error || error.response?.data?.message || fallback;

// Cek apakah JWT di localStorage masih berlaku (tanpa perlu panggil server)
export const tokenMasihValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const userSaatIni = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

export default api;
