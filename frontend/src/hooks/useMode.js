import { useCallback, useEffect, useState } from "react";

const KEY = "agroklimat:mode";

/**
 * Urutan penentuan mode:
 *   1. pilihan pengguna yang tersimpan
 *   2. preferensi sistem (prefers-color-scheme)
 *   3. gelap, mode utama produk ini
 */
const bacaAwal = () => {
  try {
    const tersimpan = localStorage.getItem(KEY);
    if (tersimpan === "light" || tersimpan === "dark") return tersimpan;
  } catch {
    // localStorage bisa diblokir (mode privat, kebijakan browser), abaikan
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return "dark";
};

export function useMode() {
  const [mode, setMode] = useState(bacaAwal);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // tidak fatal: mode tetap berlaku untuk sesi ini
    }
  }, [mode]);

  // Ikuti perubahan preferensi sistem selama pengguna belum memilih sendiri
  useEffect(() => {
    if (!window.matchMedia) return;
    let sudahMemilih = false;
    try {
      sudahMemilih = Boolean(localStorage.getItem(KEY));
    } catch {
      /* abaikan */
    }
    if (sudahMemilih) return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e) => setMode(e.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(
    () => setMode((m) => (m === "dark" ? "light" : "dark")),
    []
  );

  return { mode, setMode, toggle };
}

/** Set atribut sedini mungkin agar tidak ada kedipan sebelum React jalan. */
export function terapkanModeAwal() {
  document.documentElement.setAttribute("data-mode", bacaAwal());
}
