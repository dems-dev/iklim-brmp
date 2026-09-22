import React from "react";

/* ==========================================================================
   Komponen dasar, tujuh potongan ini menyusun seluruh layar aplikasi.
   Semua warna lewat token, jadi tidak ada satu pun varian `dark:`.
   ========================================================================== */

const cx = (...c) => c.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ Button */
export function Button({
  variant = "default",
  size = "md",
  as,
  className,
  children,
  ...rest
}) {
  const Tag = as || "button";
  const base =
    "inline-flex items-center gap-2 font-semibold rounded-[7px] border " +
    "transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-panel border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3",
    primary:
      "bg-accent-line border-accent-line text-on-accent hover:brightness-110",
    ghost: "bg-transparent border-transparent text-ink-2 hover:bg-panel-2 hover:text-ink",
    danger: "bg-transparent border-crit text-crit hover:bg-crit-bg",
  };
  const sizes = {
    sm: "text-[11.5px] px-[11px] py-[6px]",
    md: "text-[12.5px] px-[14px] py-[8px]",
  };
  return (
    <Tag className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------- Chip */
export function Chip({ active, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={Boolean(active)}
      className={cx(
        "font-mono text-[11px] font-semibold px-[10px] py-[5px] rounded-full border transition-colors",
        active
          ? "bg-accent-line border-accent-line text-on-accent"
          : "border-rule-2 text-ink-3 hover:text-ink hover:border-ink-3",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Field */
export function Field({ label, children, className }) {
  return (
    <label className={cx("flex flex-col gap-[5px]", className)}>
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

export function Input({ className, ...rest }) {
  return (
    <input
      className={cx(
        "border border-rule-2 rounded-md px-[11px] py-[7px] text-[12.5px]",
        "text-ink bg-bg placeholder:text-ink-3 w-full sm:w-auto sm:min-w-[140px]",
        "focus:border-accent-line outline-none",
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={cx(
        "border border-rule-2 rounded-md px-[11px] py-[7px] text-[12.5px]",
        "text-ink bg-bg w-full sm:w-auto sm:min-w-[140px] focus:border-accent-line outline-none",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

/* -------------------------------------------------------------------- Tile */
export function Tile({ label, code, value, unit, detail, tone, children }) {
  const toneColor =
    tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : tone === "good" ? "text-accent" : "text-ink";
  return (
    <div className="bg-panel border border-rule rounded-card px-[15px] pt-[14px] pb-3">
      <div className="label-caps mb-2 flex items-center gap-1.5">
        <span>{label}</span>
        {code && <em className="not-italic font-mono opacity-75 tracking-normal">{code}</em>}
      </div>
      <div className={cx("num text-[25px] font-bold leading-none tracking-[-0.03em]", toneColor)}>
        {value}
        {unit && <small className="text-[12.5px] font-medium text-ink-3 ml-[3px]">{unit}</small>}
      </div>
      {detail && <div className="text-[11px] text-ink-2 mt-[7px]">{detail}</div>}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */
export function Badge({ tone = "neutral", className, children }) {
  const tones = {
    neutral: "bg-panel-2 text-ink-3",
    good: "bg-soft text-accent",
    warn: "bg-warn-bg text-warn",
    crit: "bg-crit-bg text-crit",
  };
  return (
    <span
      className={cx(
        "font-mono text-[9.5px] font-semibold px-1.5 py-[3px] rounded tracking-[0.04em] shrink-0",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* Titik status, selalu berpasangan dengan teks, tidak pernah warna saja */
export function StatusDot({ active }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "w-[7px] h-[7px] rounded-full shrink-0",
        active ? "bg-accent-line" : "bg-rule-2"
      )}
    />
  );
}

/* ------------------------------------------------------------------- Panel */
export function Panel({ title, sub, right, className, bodyClass, children }) {
  return (
    <section
      className={cx("bg-panel border border-rule rounded-card", className)}
    >
      {(title || right) && (
        <header className="flex items-baseline gap-3 px-[17px] pt-4 pb-1">
          {title && (
            <h2 className="font-display text-[14px] font-bold tracking-[-0.015em] m-0">
              {title}
            </h2>
          )}
          {sub && <span className="text-[11px] text-ink-3">{sub}</span>}
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      <div className={cx("px-[17px] pb-3", bodyClass)}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- Keadaan */
export function EmptyState({ icon = "◌", title, children, action }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-[26px] text-ink-3 mb-2.5">{icon}</div>
      <p className="text-[14px] font-semibold text-ink m-0 mb-1.5">{title}</p>
      {children && (
        <p className="text-[12.5px] text-ink-2 m-0 max-w-[360px] mx-auto leading-relaxed">
          {children}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Terjadi kesalahan", children, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-crit-bg border border-crit/30 rounded-card px-4 py-3.5 flex items-start gap-3"
    >
      <Badge tone="crit">!</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-crit m-0">{title}</p>
        {children && (
          <p className="text-[12.5px] text-ink-2 m-0 mt-1 leading-relaxed">{children}</p>
        )}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }) {
  return (
    <div className={cx("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-[30px]" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Tabel */
export function Table({ children, className }) {
  return (
    // Lebar tabel 10 kolom melebihi layar ponsel; biarkan wadahnya sendiri
    // yang bergulir agar badan halaman tidak ikut bergeser mendatar.
    <div className="overflow-x-auto max-w-full">
      <table className={cx("border-collapse w-full text-[12px]", className)}>
        {children}
      </table>
    </div>
  );
}

export function Th({ align = "right", className, children }) {
  return (
    <th
      className={cx(
        "label-caps px-3 py-[9px] border-b border-rule whitespace-nowrap bg-head-bg",
        align === "left" ? "text-left" : "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ align = "right", mono = true, className, children }) {
  return (
    <td
      className={cx(
        "px-3 py-2 border-b border-rule whitespace-nowrap text-ink",
        mono && "num",
        align === "left" ? "text-left" : "text-right",
        className
      )}
    >
      {children}
    </td>
  );
}
