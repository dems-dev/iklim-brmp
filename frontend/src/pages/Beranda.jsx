import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { useMode } from "../hooks/useMode";
import { tokenMasihValid } from "../lib/api";


export default function Beranda() {
  const { mode, toggle } = useMode();
  const masuk = tokenMasihValid();

  return (
    /* Tinggi dikunci ke satu layar. h-dvh mengikuti bilah alamat peramban
       ponsel yang menyusut saat digulir, tidak seperti 100vh. */
    <div className="latar-foto h-dvh bg-bg text-ink flex flex-col overflow-hidden">
      {/* atas */}
      <header className="flex items-center gap-2.5 px-4 sm:px-7 py-3 shrink-0">
<img
          src="/logo-kementan.png"
          alt="Logo Kementerian Pertanian Republik Indonesia"
          className="w-7 h-7 object-contain shrink-0"
        />
        <span className="font-bold text-[13px] tracking-[0.01em]">AGROKLIMAT</span>
        <span className="hidden sm:block text-[11px] text-ink-3 border-l border-rule pl-2.5 ml-0.5">
          BRMP Kementerian Pertanian
        </span>

        <button
          type="button"
          onClick={toggle}
          aria-label={mode === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          className="ml-auto w-[29px] h-[29px] rounded-[7px] border border-rule-2 grid place-items-center
                     text-ink-2 text-[13px] hover:text-ink hover:border-ink-3 transition-colors shrink-0"
        >
          {mode === "dark" ? "◐" : "◑"}
        </button>
      </header>

      {/* tengah */}
      <main className="flex-1 min-h-0 grid place-items-center px-5 sm:px-7">
        <div className="w-full max-w-[880px]">
          <div className="max-w-[560px]">
            <p className="font-mono text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase text-accent m-0 mb-3.5">
              Stasiun Cuaca Otomatis
            </p>

            <h1
              className="font-display font-extrabold leading-[1.05] tracking-[-0.032em] m-0 mb-4"
              style={{ fontSize: "clamp(27px, 4.6vw, 46px)", textWrap: "balance" }}
            >
              Platform Informasi Iklim Agroklimat
            </h1>

            <p className="text-[13.5px] sm:text-[15.5px] leading-relaxed text-ink-2 m-0 mb-3">
              Kelola data iklim harian dari jaringan stasiun AWS milik Balai
              Perakitan dan Pengujian Agroklimat dan Hidrologi Pertanian, mulai
              dari berkas logger mentah sampai laporan berkop surat.
            </p>

            <p className="text-[12.5px] sm:text-[13.5px] leading-relaxed text-ink-3 m-0 mb-6">
              Suhu, kelembapan, curah hujan, angin, dan radiasi global. Setiap
              nilai diperiksa mutunya sebelum tersimpan.
            </p>

            <div className="flex gap-2.5 flex-wrap">
              {masuk ? (
                <Button as={Link} to="/dasbor" variant="primary" className="py-2.5 px-5">
                  Buka dasbor
                </Button>
              ) : (
                <>
                  <Button as={Link} to="/register" variant="primary" className="py-2.5 px-5">
                    Buat akun
                  </Button>
                  <Button as={Link} to="/login" className="py-2.5 px-5">
                    Masuk
                  </Button>
                </>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* bawah */}
      <footer className="shrink-0 px-4 sm:px-7 py-3.5 border-t border-rule">
        <p className="text-[10.5px] sm:text-[11.5px] text-ink-3 m-0 leading-relaxed">
          Balai Perakitan dan Pengujian Agroklimat dan Hidrologi Pertanian
          <span className="hidden sm:inline">
            {" · "}Badan Perakitan dan Modernisasi Pertanian
          </span>
          {" · "}Cimanggu, Bogor
        </p>
      </footer>
    </div>
  );
}
