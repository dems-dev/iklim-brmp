import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useChartTheme } from "../../hooks/useChartTheme";
import { useLayarKecil } from "../../hooks/useViewport";

/* ==========================================================================
   Lapisan grafik.

   Recharts butuh warna sebagai nilai nyata, bukan var(--x), jadi token
   dibaca sekali dari CSS lalu ikut diperbarui saat mode berganti. Semua
   grafik memakai hook ini, sehingga cukup satu tempat untuk diurus.
   ========================================================================== */

const axisProps = (t) => ({
  stroke: t.grid,
  tick: { fill: t.text, fontSize: 10, fontFamily: "IBM Plex Mono, monospace" },
  tickLine: false,
  axisLine: { stroke: t.grid },
});

/* Tooltip memakai token, bukan gaya bawaan Recharts yang selalu terang */
function TipBox({ active, payload, label, satuan, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule2}`,
        borderRadius: 8,
        padding: "8px 11px",
        fontSize: 12,
        color: t.ink,
        boxShadow: "0 8px 24px -12px rgba(0,0,0,.5)",
      }}
    >
      <div style={{ color: t.text, fontSize: 10.5, marginBottom: 5 }}>{label}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: "flex",
            gap: 14,
            fontFamily: "IBM Plex Mono, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: t.text }}>{p.name}</span>
          <strong style={{ marginLeft: "auto" }}>
            {p.value ?? "–"}
            {satuan ? ` ${satuan}` : ""}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Pita rentang + garis rata-rata.

   Bentuk ini konvensi grafik meteorologi: satu sumbu, satu warna. Pita
   menyatakan rentang harian (min–maks), garis menyatakan rata-rata. Jauh
   lebih terbaca daripada tiga garis yang saling menyilang.
   -------------------------------------------------------------------------- */
export function BandChart({ data, min, mean, max, satuan = "°C", height = 220 }) {
  const t = useChartTheme();
  const kecil = useLayarKecil();
  const tinggi = kecil ? Math.round(height * 0.72) : height;

  // Area di Recharts digambar dari sumbu; untuk pita, gambar dua area
  // bertumpuk: dasar transparan setinggi min, lalu selisih max−min.
  const siap = data.map((d) => ({
    ...d,
    _dasar: d[min],
    _rentang: d[max] != null && d[min] != null ? d[max] - d[min] : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <ComposedChart data={siap} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={kecil ? 40 : 24} />
        <YAxis {...axisProps(t)} width={44} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          content={<TipBox satuan={satuan} t={t} />}
          cursor={{ stroke: t.rule2, strokeWidth: 1 }}
        />
        <Area
          dataKey="_dasar"
          stackId="pita"
          stroke="none"
          fill="none"
          isAnimationActive={false}
          name="min"
          legendType="none"
        />
        <Area
          dataKey="_rentang"
          stackId="pita"
          stroke="none"
          fill={t.line}
          fillOpacity={0.17}
          isAnimationActive={false}
          name={`Rentang ${min}–${max}`}
        />
        <Line
          dataKey={mean}
          stroke={t.line}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: t.line, stroke: t.panel, strokeWidth: 2 }}
          isAnimationActive={false}
          name={mean}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
   Batang untuk curah hujan.

   Sengaja batang, bukan garis: curah hujan adalah jumlah per hari. Garis
   akan menyiratkan hujan turun terus-menerus di antara tanggal.
   -------------------------------------------------------------------------- */
export function RainChart({ data, field = "RR", height = 180 }) {
  const t = useChartTheme();
  const kecil = useLayarKecil();
  return (
    <ResponsiveContainer width="100%" height={kecil ? Math.round(height * 0.78) : height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={kecil ? 40 : 24} />
        <YAxis {...axisProps(t)} width={44} />
        <Tooltip
          content={<TipBox satuan="mm" t={t} />}
          cursor={{ fill: t.grid, fillOpacity: 0.5 }}
        />
        <Bar
          dataKey={field}
          fill={t.line}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
          name="Curah hujan"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Garis tunggal untuk variabel lain */
export function LineChartOne({ data, field, satuan = "", height = 180 }) {
  const t = useChartTheme();
  const kecil = useLayarKecil();
  return (
    <ResponsiveContainer width="100%" height={kecil ? Math.round(height * 0.78) : height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={kecil ? 40 : 24} />
        <YAxis {...axisProps(t)} width={44} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          content={<TipBox satuan={satuan} t={t} />}
          cursor={{ stroke: t.rule2, strokeWidth: 1 }}
        />
        <Area dataKey={field} stroke="none" fill={t.line} fillOpacity={0.14} isAnimationActive={false} name={field} />
        <Line
          dataKey={field}
          stroke={t.line}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: t.line, stroke: t.panel, strokeWidth: 2 }}
          isAnimationActive={false}
          name={field}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* Sparkline ringkas untuk tile dan deret kecil, SVG langsung, tanpa Recharts */
export function Sparkline({ values, height = 26 }) {
  const t = useChartTheme();
  const bersih = values.filter((v) => v != null && v !== 8888 && v !== 9999);
  if (bersih.length < 2) return <div style={{ height }} />;

  const W = 150;
  const p = 2;
  const lo = Math.min(...bersih);
  const hi = Math.max(...bersih);
  const span = hi - lo || 1;
  const n = bersih.length;
  const x = (i) => p + ((W - p * 2) * i) / (n - 1);
  const y = (v) => height - p - ((v - lo) / span) * (height - p * 2);

  let d = "";
  for (let i = 0; i < n; i++) d += `${i ? "L" : "M"}${x(i).toFixed(1)},${y(bersih[i]).toFixed(1)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
      style={{ display: "block", marginTop: 8 }}
    >
      <path d={`${d}L${x(n - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`} fill={t.line} fillOpacity={0.15} />
      <path
        d={d}
        fill="none"
        stroke={t.line}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(n - 1)} cy={y(bersih[n - 1])} r={2.2} fill={t.line} />
    </svg>
  );
}
