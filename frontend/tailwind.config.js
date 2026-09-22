/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Layar ponsel paling sempit (iPhone SE sekitar 375px)
      screens: { xs: "400px" },
      // Semua warna menunjuk ke CSS variable, jadi kelas utilitas ikut
      // berganti saat data-mode diubah · tanpa perlu varian dark: sama sekali.
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        "head-bg": "var(--head-bg)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        rule: "var(--rule)",
        "rule-2": "var(--rule-2)",
        accent: "var(--accent)",
        "accent-line": "var(--accent-line)",
        "accent-2": "var(--accent-2)",
        soft: "var(--soft)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        crit: "var(--crit)",
        "crit-bg": "var(--crit-bg)",
        "on-accent": "var(--on-accent)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Archivo", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        "3xs": ["9.5px", { lineHeight: "1.35" }],
      },
      borderRadius: {
        card: "9px",
      },
    },
  },
  plugins: [],
};
