import { useEffect, useState } from "react";

/* Recharts butuh warna sebagai nilai nyata, bukan var(--x). Token dibaca
   sekali dari CSS lalu diperbarui saat data-mode berubah, sehingga seluruh
   grafik ikut berganti mode tanpa disentuh satu per satu. */
function bacaToken() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    line: v("--accent-line"),
    line2: v("--accent-2"),
    grid: v("--rule"),
    text: v("--ink-3"),
    ink: v("--ink"),
    panel: v("--panel"),
    rule2: v("--rule-2"),
  };
}

export function useChartTheme() {
  const [t, setT] = useState(bacaToken);
  useEffect(() => {
    const obs = new MutationObserver(() => setT(bacaToken()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });
    return () => obs.disconnect();
  }, []);
  return t;
}
