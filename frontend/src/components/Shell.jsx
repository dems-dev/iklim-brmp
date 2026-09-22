import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useMode } from "../hooks/useMode";
import { userSaatIni } from "../lib/api";

const NAV = [
  { to: "/dasbor", icon: "▤", label: "Dasbor", pendek: "Dasbor" },
  { to: "/data", icon: "◱", label: "Eksplorasi Data", pendek: "Data" },
  { to: "/mutu", icon: "⚑", label: "Mutu Data", pendek: "Mutu" },
  { to: "/unggah", icon: "↥", label: "Unggah", pendek: "Unggah", adminSaja: true },
];

function ModeToggle() {
  const { mode, toggle } = useMode();
  const keTerang = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={keTerang ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={keTerang ? "Mode terang" : "Mode gelap"}
      className="w-[29px] h-[29px] rounded-[7px] border border-rule-2 grid place-items-center
                 text-ink-2 text-[13px] hover:text-ink hover:border-ink-3 transition-colors shrink-0"
    >
      {keTerang ? "◐" : "◑"}
    </button>
  );
}

export default function Shell({ setIsLoggedIn, children }) {
  const navigate = useNavigate();
  const user = userSaatIni();
  const isAdmin = user?.role === "admin";
  const menu = NAV.filter((n) => !n.adminSaja || isAdmin);

  const keluar = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn?.(false);
    navigate("/login");
  };

  const inisial = (user?.username || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* ---------------------------------------------------------- topbar */}
      <header className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-panel border-b border-rule">
        <div className="flex items-center gap-2.5 font-bold text-[13.5px] tracking-[0.01em] min-w-0">
          <img
            src="/logo-kementan.png"
            alt="Logo Kementerian Pertanian Republik Indonesia"
            className="w-7 h-7 object-contain shrink-0"
          />
          <span className="hidden sm:inline">AGROKLIMAT</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          {user && (
            <span className="hidden md:flex items-center gap-1.5 text-[11px] text-ink-2 font-medium">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-accent-line"
                style={{ boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent-line) 24%, transparent)" }}
              />
              {isAdmin ? "Admin" : "Pengguna"}
            </span>
          )}
          <ModeToggle />
          <span
            className="w-[27px] h-[27px] rounded-full bg-soft text-accent grid place-items-center
                       text-[10.5px] font-bold shrink-0"
            title={user?.username}
          >
            {inisial}
          </span>
          <button
            type="button"
            onClick={keluar}
            aria-label="Keluar"
            className="text-[12px] font-semibold text-ink-3 hover:text-crit transition-colors px-1 shrink-0"
          >
            <span className="hidden sm:inline">Keluar</span>
            <span className="sm:hidden text-[15px]" aria-hidden="true">⏻</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* -------------------------------- rail kiri, hanya layar sedang ke atas */}
        <nav
          aria-label="Navigasi utama"
          className="hidden sm:flex w-[54px] shrink-0 bg-panel border-r border-rule py-3
                     flex-col items-center gap-1"
        >
          {menu.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              title={n.label}
              aria-label={n.label}
              className={({ isActive }) =>
                [
                  "w-9 h-9 rounded-[9px] grid place-items-center text-[14px] relative transition-colors",
                  isActive
                    ? "bg-soft text-accent"
                    : "text-ink-3 hover:text-ink hover:bg-panel-2",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-[9px] top-[9px] bottom-[9px] w-[2.5px]
                                 bg-accent-line rounded-r-sm"
                    />
                  )}
                  {n.icon}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Padding bawah menyisakan ruang untuk bilah nav di layar kecil */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-5 pb-24 sm:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ------------------------------ bilah bawah, hanya layar kecil */}
      <nav
        aria-label="Navigasi utama"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-rule
                   flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {menu.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            aria-label={n.label}
            className={({ isActive }) =>
              [
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors",
                isActive ? "text-accent" : "text-ink-3",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 inset-x-4 h-[2.5px] bg-accent-line rounded-b-sm"
                  />
                )}
                <span className="text-[16px] leading-none" aria-hidden="true">{n.icon}</span>
                <span className="text-[10px] font-semibold leading-none">{n.pendek}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* Judul halaman, dipakai seragam di seluruh layar */
export function PageHead({ title, sub, actions }) {
  return (
    <div className="flex items-start sm:items-end gap-3 sm:gap-4 flex-wrap mb-4">
      <div className="min-w-0">
        <h1 className="font-display text-[20px] sm:text-[23px] font-bold tracking-[-0.025em]
                       leading-tight m-0">
          {title}
        </h1>
        {sub && <p className="text-[12px] sm:text-[12.5px] text-ink-2 m-0 mt-[5px]">{sub}</p>}
      </div>
      {actions && (
        <div className="w-full sm:w-auto sm:ml-auto flex gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
}

/* Baris penyaring, di layar kecil menumpuk, di layar lebar sebaris */
export function FilterBar({ children, chips }) {
  return (
    <div className="bg-panel border border-rule rounded-card px-3 sm:px-3.5 py-3 mb-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 sm:items-end">
        {children}
      </div>
      {chips && (
        <div className="mt-3 sm:mt-2.5 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
          <div className="flex gap-1.5 w-max sm:w-auto sm:flex-wrap">{chips}</div>
        </div>
      )}
    </div>
  );
}
