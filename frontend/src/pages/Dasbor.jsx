import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { pesanError } from "../lib/api";
import { PageHead } from "../components/Shell";
import {
  Button, Select, Tile, Panel, StatusDot, Badge, EmptyState, ErrorState, SkeletonRows,
} from "../components/ui";
import { BandChart, Sparkline } from "../components/charts/Charts";
import { VARIABEL, angka, siapkanGrafik, ringkas, tanggalPanjang } from "../lib/iklim";

const JUMLAH_HARI = 30;
const kodeKhusus = (v) => v === 8888 || v === 9999;

export default function Dasbor() {
  /* Stasiun yang terdaftar di sistem, yang belum punya data tetap ditampilkan
     supaya operator tahu ada stasiun yang belum mengirim. */
  const [terdaftar, setTerdaftar] = useState([]);
  const [stats, setStats] = useState([]);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Ringkasan dan grafik selalu untuk SATU stasiun. Tanpa ini, "30 hari
     terakhir" sebenarnya 30 baris terbaru dari banyak stasiun sekaligus. */
  const [pilihan, setPilihan] = useState("");
  const [rows, setRows] = useState([]);
  const [memuatRows, setMemuatRows] = useState(false);
  const [errorRows, setErrorRows] = useState("");
  const [cobaLagi, setCobaLagi] = useState(0);

  const muat = async () => {
    setLoading(true);
    setError("");
    try {
      const [st, s, a] = await Promise.all([
        api.get("/iklim/stations"),
        api.get("/iklim/statistics"),
        api.get("/iklim/validasi/audit").catch(() => null),
      ]);
      const statistik = s.data.statistics || [];
      setTerdaftar(st.data.detail || []);
      setStats(statistik);
      setAudit(a?.data?.ringkasan || null);

      // Pertahankan pilihan bila masih punya data, selain itu ambil stasiun
      // dengan data paling baru.
      setPilihan((lama) =>
        statistik.some((x) => x.stasiun === lama)
          ? lama
          : [...statistik].sort(
              (x, y) => new Date(y.endDate) - new Date(x.endDate) || x.stasiun.localeCompare(y.stasiun)
            )[0]?.stasiun || ""
      );
    } catch (err) {
      setError(pesanError(err, "Gagal memuat dasbor"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muat();
  }, []);

  useEffect(() => {
    if (!pilihan) {
      setRows([]);
      return;
    }
    let batal = false;
    setMemuatRows(true);
    setErrorRows("");
    api
      .get("/iklim/search", { params: { stasiun: pilihan, page: 1, limit: JUMLAH_HARI } })
      .then((r) => { if (!batal) setRows(r.data.data || []); })
      .catch((err) => { if (!batal) setErrorRows(pesanError(err, "Gagal memuat data stasiun")); })
      .finally(() => { if (!batal) setMemuatRows(false); });
    return () => { batal = true; };
  }, [pilihan, cobaLagi]);

  const grafik = useMemo(() => siapkanGrafik(rows), [rows]);
  const sTM = useMemo(() => ringkas(rows, "TM"), [rows]);
  const sRR = useMemo(() => ringkas(rows, "RR"), [rows]);
  const sUM = useMemo(() => ringkas(rows, "UM"), [rows]);
  const sRG = useMemo(() => ringkas(rows, "RG"), [rows]);

  const perStasiun = useMemo(
    () => Object.fromEntries(stats.map((s) => [s.stasiun, s])),
    [stats]
  );
  const totalBaris = stats.reduce((n, s) => n + s.totalRecords, 0);
  const aktif = stats.length;
  const labelPilihan = terdaftar.find((s) => s.NAMA === pilihan)?.LABEL || pilihan;
  const sibukRows = loading || memuatRows;

  const periode =
    rows.length > 0
      ? `${tanggalPanjang(rows[rows.length - 1].TANGGAL)} – ${tanggalPanjang(rows[0].TANGGAL)}`
      : null;

  if (error) {
    return (
      <>
        <PageHead title="Dasbor" />
        <ErrorState title="Gagal memuat dasbor" onRetry={muat}>{error}</ErrorState>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Dasbor"
        sub={
          loading
            ? "Memuat…"
            : `${terdaftar.length} stasiun terdaftar · ${aktif} aktif · ${totalBaris} baris`
        }
        actions={
          <>
            {stats.length > 0 && (
              <Select
                value={pilihan}
                onChange={(e) => setPilihan(e.target.value)}
                aria-label="Stasiun yang diringkas"
                className="sm:max-w-[240px]"
              >
                {terdaftar
                  .filter((s) => perStasiun[s.NAMA])
                  .map((s) => (
                    <option key={s.NAMA} value={s.NAMA}>{s.LABEL || s.NAMA}</option>
                  ))}
              </Select>
            )}
            <Button as={Link} to="/data" variant="primary" size="sm">
              Buka eksplorasi
            </Button>
          </>
        }
      />

      {!loading && pilihan && (
        <p className="text-[12px] text-ink-2 m-0 -mt-2 mb-3">
          Ringkasan <b className="text-ink">{labelPilihan}</b>
          {periode && !memuatRows ? ` · ${rows.length} hari terakhir (${periode})` : ""}
        </p>
      )}

      {/* ------------------------------------------------------- ringkasan */}
      {sibukRows ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[124px]" />)}
        </div>
      ) : errorRows ? (
        <div className="mb-4">
          <ErrorState title="Gagal memuat data stasiun" onRetry={() => setCobaLagi((n) => n + 1)}>
            {errorRows}
          </ErrorState>
        </div>
      ) : rows.length === 0 ? (
        <Panel className="mb-4">
          <EmptyState icon="◌" title="Belum ada data sama sekali">
            Unggah berkas Excel dari logger AWS untuk mulai mengisi sistem.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Tile label="Suhu rata-rata" code="TM" value={angka(sTM.rata)} unit="°C">
            <Sparkline values={rows.map((r) => r.TM).reverse()} />
          </Tile>
          <Tile label="Curah hujan" code="RR" value={angka(sRR.total)} unit="mm">
            <Sparkline values={rows.map((r) => r.RR).reverse()} />
          </Tile>
          <Tile label="Kelembapan" code="UM" value={angka(sUM.rata)} unit="%">
            <Sparkline values={rows.map((r) => r.UM).reverse()} />
          </Tile>
          <Tile label="Radiasi" code="RG" value={angka(sRG.rata, 0)} unit="rata²">
            <Sparkline values={rows.map((r) => r.RG).reverse()} />
          </Tile>
        </div>
      )}

      {/* --------------------------------------------------- grafik + daftar */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <Panel
          title="Suhu harian"
          sub={rows.length ? `${labelPilihan} · ${rows.length} hari terakhir · °C` : "°C"}
        >
          {sibukRows ? (
            <div className="skeleton h-[220px]" />
          ) : rows.length ? (
            <>
              <div className="flex gap-3.5 flex-wrap my-2">
                <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <i className="w-[11px] h-[9px] rounded-sm block shrink-0 bg-accent-line opacity-30" />
                  Rentang TN–TX
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <i className="w-[11px] h-[3px] rounded-sm block shrink-0 bg-accent-line" />
                  Rata-rata TM
                </span>
              </div>
              <BandChart data={grafik} min="TN" mean="TM" max="TX" satuan="°C" />
            </>
          ) : (
            <EmptyState icon="◱" title="Belum ada data untuk digambar" />
          )}
        </Panel>

        <div className="bg-panel border border-rule rounded-card overflow-hidden self-start">
          <h2 className="font-display m-0 px-4 pt-3.5 pb-2.5 text-[12.5px] font-bold border-b border-rule flex items-center gap-2">
            Stasiun
            <span className="ml-auto num text-[10.5px] font-medium text-ink-3">
              {aktif} / {terdaftar.length} aktif
            </span>
          </h2>

          {loading ? (
            <div className="p-3.5"><SkeletonRows rows={4} /></div>
          ) : (
            <>
              <div className="max-h-[360px] overflow-y-auto">
              {terdaftar.map((s) => {
                const d = perStasiun[s.NAMA];
                const dipilih = s.NAMA === pilihan;
                return (
                  <button
                    type="button"
                    key={s.NAMA}
                    disabled={!d}
                    onClick={() => setPilihan(s.NAMA)}
                    aria-pressed={dipilih}
                    className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 border-b border-rule
                                last:border-b-0 transition-colors disabled:cursor-default ${
                                  dipilih ? "bg-soft" : d ? "hover:bg-panel-2" : ""
                                }`}
                  >
                    <StatusDot active={Boolean(d)} />
                    <span className={`text-[12px] font-semibold min-w-0 ${d ? "" : "text-ink-3"}`}>
                      {s.LABEL || s.NAMA}
                      {s.WILAYAH && (
                        <small className="block font-normal text-[10.5px] text-ink-3 mt-0.5">
                          {s.WILAYAH}
                        </small>
                      )}
                    </span>
                    <span className={`ml-auto num text-[12.5px] font-semibold text-right shrink-0 ${d ? "" : "text-ink-3"}`}>
                      {d ? `${d.totalRecords}` : "-"}
                      <small className="block text-[10px] font-normal text-ink-3 mt-0.5">
                        {d ? "baris" : "kosong"}
                      </small>
                    </span>
                  </button>
                );
              })}
              </div>

              {audit && (
                <Link
                  to="/mutu"
                  className="flex items-center gap-2 px-4 py-3 bg-panel-2 hover:bg-rule transition-colors"
                >
                  {audit.jumlahError > 0 && <Badge tone="crit">{audit.jumlahError}</Badge>}
                  {audit.jumlahPeringatan > 0 && <Badge tone="warn">{audit.jumlahPeringatan}</Badge>}
                  {audit.totalTemuan === 0 && <Badge tone="good">bersih</Badge>}
                  <span className="text-[11.5px] font-medium text-ink-2">
                    {audit.totalTemuan === 0 ? "tidak ada temuan" : "temuan mutu data"}
                  </span>
                  <span className="ml-auto text-ink-3 text-[13px]">›</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* ------------------------------- deret kecil seluruh sepuluh variabel */}
      {!sibukRows && rows.length > 0 && (
        <>
          <h2 className="font-display text-[14px] font-bold tracking-[-0.015em] mt-5 mb-2.5">
            Seluruh variabel
            <span className="font-sans font-medium text-[11.5px] text-ink-3 ml-2">{labelPilihan}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {VARIABEL.map((v) => {
              const r = ringkas(rows, v.key);
              // Kode 8888/9999 bukan nilai ukur, jatuh ke rata-rata periode
              const terakhir = kodeKhusus(rows[0]?.[v.key]) ? null : rows[0]?.[v.key];
              const desimal = ["GIX", "VT", "RG"].includes(v.key) ? 0 : 1;
              return (
                <div key={v.key} className="bg-panel border border-rule rounded-card px-3 pt-2.5 pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-accent">{v.key}</span>
                    {v.satuan && <span className="text-[9.5px] text-ink-3">{v.satuan}</span>}
                  </div>
                  <div className="text-[10px] text-ink-3 mb-1.5 truncate" title={v.nama}>
                    {v.singkat}
                  </div>
                  <div className="num text-[15px] font-semibold tracking-[-0.02em]">
                    {r.n ? angka(terakhir ?? r.rata, desimal) : "-"}
                  </div>
                  <Sparkline values={rows.map((x) => x[v.key]).reverse()} height={24} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
