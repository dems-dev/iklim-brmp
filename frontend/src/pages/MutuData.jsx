import React, { useEffect, useMemo, useState } from "react";
import api, { pesanError } from "../lib/api";
import { PageHead, FilterBar } from "../components/Shell";
import {
  Button, Field, Select, Input, Tile, Panel, Badge,
  EmptyState, ErrorState, SkeletonRows,
} from "../components/ui";

/* Layar ini memakai endpoint /api/iklim/validasi/audit, memeriksa data yang
   SUDAH tersimpan, termasuk yang masuk sebelum validasi rentang ada. */

export default function MutuData() {
  const [stations, setStations] = useState([]);
  const [stasiun, setStasiun] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [hasil, setHasil] = useState(null);
  const [rentang, setRentang] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saring, setSaring] = useState("semua"); // semua | error | peringatan

  const periksa = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/iklim/validasi/audit", {
        params: { stasiun, startDate, endDate },
      });
      setHasil(data);
    } catch (err) {
      setError(pesanError(err, "Gagal memeriksa mutu data"));
      setHasil(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/iklim/stations").then((r) => setStations(r.data.stations || [])).catch(() => {});
    api.get("/iklim/validasi/rentang").then((r) => setRentang(r.data.rentang)).catch(() => {});
    periksa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = hasil?.ringkasan;
  const temuan = useMemo(() => {
    const t = hasil?.temuan || [];
    if (saring === "semua") return t;
    return t.filter((x) => x.tingkat === saring);
  }, [hasil, saring]);

  const bersih = r ? r.dataDiperiksa - new Set((hasil.temuan || []).map((t) => t.tanggal + t.stasiun)).size : 0;
  const persenBersih = r?.dataDiperiksa ? Math.round((bersih / r.dataDiperiksa) * 100) : 0;

  return (
    <>
      <PageHead
        title="Mutu Data"
        sub={
          loading
            ? "Memeriksa…"
            : r
            ? `${r.dataDiperiksa} baris diperiksa · ${r.totalTemuan} temuan`
            : "-"
        }
        actions={
          <Button size="sm" onClick={periksa} disabled={loading}>
            {loading ? "Memeriksa…" : "Periksa ulang"}
          </Button>
        }
      />

      <FilterBar>
        <Field label="Stasiun" className="col-span-2 sm:col-span-1">
          <Select value={stasiun} onChange={(e) => setStasiun(e.target.value)}>
            <option value="">Semua stasiun</option>
            {stations.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Dari">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Sampai">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Button
          variant="primary"
          onClick={periksa}
          disabled={loading}
          className="col-span-2 sm:col-span-1 justify-center sm:mb-px"
        >
          Periksa
        </Button>
      </FilterBar>

      {error && (
        <div className="mb-4">
          <ErrorState title="Pemeriksaan gagal" onRetry={periksa}>{error}</ErrorState>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[104px]" />)}
        </div>
      ) : r ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Tile label="Baris diperiksa" value={r.dataDiperiksa} detail="Seluruh data tersimpan" />
          <Tile label="Nilai mustahil" value={r.jumlahError} tone={r.jumlahError ? "crit" : "good"}
            detail="Di luar batas fisik" />
          <Tile label="Perlu dicek" value={r.jumlahPeringatan} tone={r.jumlahPeringatan ? "warn" : "good"}
            detail="Kemungkinan drift sensor" />
          <Tile label="Baris bersih" value={bersih} tone="good" detail={`${persenBersih}% dari total`} />
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-3">
        {/* -------------------------------------------------- daftar temuan */}
        <div className="bg-panel border border-rule rounded-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-rule flex-wrap">
            <h2 className="font-display m-0 text-[12.5px] font-bold">Temuan</h2>
            <span className="text-[11px] text-ink-3">urut dari terparah</span>
            <div className="ml-auto flex gap-1.5">
              {[
                ["semua", "Semua"],
                ["error", "Error"],
                ["peringatan", "Peringatan"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSaring(k)}
                  aria-pressed={saring === k}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                    saring === k
                      ? "bg-soft border-accent-line text-accent"
                      : "border-rule-2 text-ink-3 hover:text-ink"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-4"><SkeletonRows rows={5} /></div>
          ) : temuan.length === 0 ? (
            <EmptyState icon="✓" title="Tidak ada temuan">
              {r?.dataDiperiksa
                ? `Seluruh ${r.dataDiperiksa} baris berada dalam rentang wajar.`
                : "Belum ada data untuk diperiksa."}
            </EmptyState>
          ) : (
            <>
              {temuan.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-rule last:border-b-0">
                  <Badge tone={t.tingkat === "error" ? "crit" : "warn"}>
                    {t.tingkat === "error" ? "ERROR" : "CEK"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold">
                      {t.field} = <span className="num">{t.nilai}</span>
                    </div>
                    <div className="text-[10.5px] text-ink-3 mt-0.5 leading-relaxed">
                      {t.tanggal} · {t.stasiun} · {t.pesan}
                    </div>
                  </div>
                </div>
              ))}
              {hasil?.adaLagi > 0 && (
                <div className="px-4 py-2.5 text-[11.5px] text-ink-3">
                  +{hasil.adaLagi} temuan lainnya tidak ditampilkan
                </div>
              )}
            </>
          )}
        </div>

        {/* -------------------------------------------------- sebaran + info */}
        <div className="flex flex-col gap-3 self-start">
          {r && r.totalTemuan > 0 && (
            <Panel title="Sebaran">
              <div className="flex h-[7px] rounded gap-0.5 overflow-hidden my-2.5">
                {r.jumlahError > 0 && (
                  <i className="block h-full rounded-sm bg-crit"
                    style={{ width: `${(r.jumlahError / r.totalTemuan) * 100}%` }} />
                )}
                {r.jumlahPeringatan > 0 && (
                  <i className="block h-full rounded-sm bg-warn"
                    style={{ width: `${(r.jumlahPeringatan / r.totalTemuan) * 100}%` }} />
                )}
              </div>
              <div className="text-[11px] text-ink-2 leading-loose">
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 rounded-sm bg-crit shrink-0" />
                  Error <b className="num text-ink ml-auto">{r.jumlahError}</b>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 rounded-sm bg-warn shrink-0" />
                  Peringatan <b className="num text-ink ml-auto">{r.jumlahPeringatan}</b>
                </div>
                {r.perVariabel && Object.keys(r.perVariabel).length > 0 && (
                  <div className="flex gap-2 items-center pt-2 mt-1.5 border-t border-rule">
                    <span className="text-ink-3">Variabel terdampak</span>
                    <b className="num text-accent ml-auto">
                      {Object.keys(r.perVariabel).join(", ")}
                    </b>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-panel border border-rule rounded-card text-[12px] text-ink-2">
            <span className="w-[15px] h-[15px] rounded border-[1.5px] border-accent-line bg-accent-line
                             text-on-accent grid place-items-center text-[9px] shrink-0 mt-px">
              ✓
            </span>
            <span>
              Kode <b className="text-ink">8888</b> dan <b className="text-ink">9999</b> dikecualikan
              dari seluruh pemeriksaan.
            </span>
          </div>

          {rentang && (
            <Panel title="Rentang wajar" sub="acuan pemeriksaan">
              <div className="text-[11px] leading-relaxed mt-1.5">
                {Object.entries(rentang).map(([k, def]) => (
                  <div key={k} className="flex gap-2 items-baseline py-[3px] border-b border-rule last:border-b-0">
                    <span className="font-mono font-semibold text-accent w-9 shrink-0">{k}</span>
                    <span className="num text-ink-2">
                      {def.wajar.min} – {def.wajar.max}
                    </span>
                    <span className="num text-ink-3 ml-auto text-[10px]">
                      batas {def.batas.min}–{def.batas.max}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
