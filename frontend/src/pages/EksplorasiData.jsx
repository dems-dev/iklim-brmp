import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { pesanError } from "../lib/api";
import { PageHead, FilterBar } from "../components/Shell";
import {
  Button, Chip, Field, Select, Input, Tile, Panel, Table, Th, Td,
  EmptyState, ErrorState, SkeletonRows, Badge,
} from "../components/ui";
import { BandChart, RainChart } from "../components/charts/Charts";
import {
  VARIABEL, KODE_FIELD, byKey, formatNilai, angka,
  siapkanGrafik, ringkas, tanggalPendek,
} from "../lib/iklim";

const PILIHAN_AWAL = ["TN", "TM", "TX", "UM", "RR", "RG"];

export default function EksplorasiData() {
  const [stations, setStations] = useState([]);
  const [stasiun, setStasiun] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [aktif, setAktif] = useState(new Set(PILIHAN_AWAL));

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mengekspor, setMengekspor] = useState("");
  const [sudahCari, setSudahCari] = useState(false);

  useEffect(() => {
    api
      .get("/iklim/stations")
      .then((r) => setStations(r.data.stations || []))
      .catch(() => {
        /* daftar stasiun opsional, pencarian tetap bisa jalan */
      });
  }, []);

  const cari = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/iklim/search", {
          params: { stasiun, startDate, endDate, page, limit: 31 },
        });
        setRows(data.data || []);
        setPagination(data.pagination || null);
        setSudahCari(true);
      } catch (err) {
        setError(pesanError(err, "Gagal mengambil data"));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [stasiun, startDate, endDate]
  );

  // Muat sekali saat halaman dibuka supaya tidak menyambut layar kosong
  useEffect(() => {
    cari(1);
    // sengaja hanya sekali; pencarian berikutnya lewat tombol
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ekspor = async (format) => {
    setMengekspor(format);
    try {
      const res = await api.get(`/iklim/export/${format}`, {
        params: { stasiun, startDate, endDate, limit: 10000 },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-iklim.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(pesanError(err, "Gagal mengekspor data"));
    } finally {
      setMengekspor("");
    }
  };

  const toggleVar = (k) =>
    setAktif((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const kolom = useMemo(() => KODE_FIELD.filter((k) => aktif.has(k)), [aktif]);
  const grafik = useMemo(() => siapkanGrafik(rows), [rows]);

  const sTM = useMemo(() => ringkas(rows, "TM"), [rows]);
  const sRR = useMemo(() => ringkas(rows, "RR"), [rows]);
  const sUM = useMemo(() => ringkas(rows, "UM"), [rows]);
  const sTX = useMemo(() => ringkas(rows, "TX"), [rows]);
  const hariHujan = useMemo(
    () => rows.filter((r) => r.RR > 0 && r.RR !== 8888 && r.RR !== 9999).length,
    [rows]
  );

  const adaSuhu = aktif.has("TN") && aktif.has("TX");
  const periode =
    rows.length > 0
      ? `${tanggalPendek(rows[rows.length - 1].TANGGAL)} – ${tanggalPendek(rows[0].TANGGAL)}`
      : "-";

  return (
    <>
      <PageHead
        title="Eksplorasi Data"
        sub={
          loading
            ? "Memuat…"
            : `${stasiun || "Semua stasiun"} · ${periode} · ${pagination?.totalItems ?? 0} baris`
        }
        actions={
          <>
            <Button size="sm" onClick={() => ekspor("pdf")} disabled={!rows.length || mengekspor}>
              {mengekspor === "pdf" ? "Menyiapkan…" : "PDF"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => ekspor("excel")}
              disabled={!rows.length || mengekspor}
            >
              {mengekspor === "excel" ? "Menyiapkan…" : "Excel"}
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------- penyaring */}
      <FilterBar
        chips={VARIABEL.map((v) => (
          <Chip
            key={v.key}
            active={aktif.has(v.key)}
            onClick={() => toggleVar(v.key)}
            title={`${v.nama}${v.satuan ? ` (${v.satuan})` : ""}`}
          >
            {v.key}
          </Chip>
        ))}
      >
        <Field label="Stasiun" className="col-span-2 sm:col-span-1">
          <Select value={stasiun} onChange={(e) => setStasiun(e.target.value)}>
            <option value="">Semua stasiun</option>
            {stations.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
          onClick={() => cari(1)}
          disabled={loading}
          className="col-span-2 sm:col-span-1 justify-center sm:mb-px"
        >
          {loading ? "Mencari…" : "Cari"}
        </Button>
      </FilterBar>

      {error && (
        <div className="mb-4">
          <ErrorState title="Gagal memuat data" onRetry={() => cari(1)}>
            {error}
          </ErrorState>
        </div>
      )}

      {/* --------------------------------------------------------- statistik */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[104px]" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Tile
            label="Suhu rata-rata" code="TM"
            value={angka(sTM.rata)} unit="°C"
            detail={sTM.n ? `Rentang ${angka(sTM.min)} – ${angka(sTM.maks)}` : "Tidak ada data"}
          />
          <Tile
            label="Curah hujan" code="RR"
            value={angka(sRR.total)} unit="mm"
            detail={`${hariHujan} hari hujan`}
          />
          <Tile
            label="Kelembapan" code="UM"
            value={angka(sUM.rata)} unit="%"
            detail={sUM.n ? `Rentang ${angka(sUM.min)} – ${angka(sUM.maks)}` : "Tidak ada data"}
          />
          <Tile
            label="Suhu maksimum" code="TX"
            value={angka(sTX.maks)} unit="°C"
            detail={`Dari ${sTX.n} pengamatan`}
          />
        </div>
      ) : null}

      {/* ----------------------------------------------------------- grafik */}
      {!loading && rows.length > 0 && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3 mb-3">
          {adaSuhu ? (
            <Panel title="Suhu harian" sub="°C">
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
            </Panel>
          ) : (
            <Panel title="Suhu harian">
              <EmptyState icon="◱" title="Pilih variabel TN dan TX">
                Grafik pita suhu memerlukan kolom suhu minimum dan maksimum.
              </EmptyState>
            </Panel>
          )}

          <Panel title="Curah hujan" sub="mm">
            {aktif.has("RR") ? (
              <>
                <RainChart data={grafik} />
                <div className="flex gap-3.5 text-[11px] text-ink-2 pt-2 mt-1.5 border-t border-rule">
                  <span>
                    Total <b className="num text-ink">{angka(sRR.total)} mm</b>
                  </span>
                  <span>
                    Hari hujan <b className="num text-ink">{hariHujan}</b>
                  </span>
                </div>
              </>
            ) : (
              <EmptyState icon="◱" title="Variabel RR tidak dipilih" />
            )}
          </Panel>
        </div>
      )}

      {/* ------------------------------------------------------------ tabel */}
      <div className="bg-panel border border-rule rounded-card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="◌"
            title={sudahCari ? "Tidak ada data pada rentang ini" : "Belum ada pencarian"}
            action={
              <Button variant="primary" size="sm" onClick={() => { setStasiun(""); setStartDate(""); setEndDate(""); cari(1); }}>
                Tampilkan semua
              </Button>
            }
          >
            Coba longgarkan penyaring, ganti stasiun atau perlebar rentang tanggalnya.
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th align="left">Tanggal</Th>
                  <Th align="left">Stasiun</Th>
                  {kolom.map((k) => (
                    <Th key={k}>{k}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-panel-2 transition-colors">
                    <Td align="left">{tanggalPendek(r.TANGGAL)}</Td>
                    <Td align="left" mono={false} className="text-ink-2">
                      {r.NAMA_STASIUN}
                    </Td>
                    {kolom.map((k) => {
                      const f = formatNilai(r[k], k === "GIX" || k === "VT" || k === "RG" ? 0 : 1);
                      return (
                        <Td
                          key={k}
                          className={
                            f.tone === "crit" ? "text-crit font-semibold"
                            : f.tone === "warn" ? "text-warn font-semibold"
                            : f.teks === "–" ? "text-ink-3" : ""
                          }
                        >
                          <span title={f.judul || `${byKey[k].nama}${byKey[k].satuan ? ` (${byKey[k].satuan})` : ""}`}>
                            {f.teks}
                          </span>
                        </Td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="flex items-center gap-x-3.5 gap-y-2 px-3.5 py-2.5 text-[11px] text-ink-3 border-t border-rule flex-wrap">
              <span>
                {rows.length} dari {pagination?.totalItems ?? rows.length} baris
              </span>
              <span className="flex items-center gap-2">
                <Badge tone="warn">8888</Badge> tidak terukur
                <Badge tone="crit">9999</Badge> tidak ada data
              </span>
              {pagination && pagination.totalPages > 1 && (
                <span className="w-full sm:w-auto sm:ml-auto flex gap-1.5 items-center justify-end">
                  <Button size="sm" disabled={!pagination.hasPrev} onClick={() => cari(pagination.currentPage - 1)}>
                    ‹
                  </Button>
                  <span className="num px-1">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <Button size="sm" disabled={!pagination.hasNext} onClick={() => cari(pagination.currentPage + 1)}>
                    ›
                  </Button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
