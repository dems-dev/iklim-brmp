import React, { useEffect, useRef, useState } from "react";
import api, { pesanError } from "../lib/api";
import { PageHead } from "../components/Shell";
import { Button, Field, Select, Panel, Badge, EmptyState } from "../components/ui";

export default function Unggah() {
  const [file, setFile] = useState(null);
  const [daftarStasiun, setDaftarStasiun] = useState([]);
  const [stasiun, setStasiun] = useState("");
  const [modeKetat, setModeKetat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState(null); // { sukses, pesan, data }
  const [seret, setSeret] = useState(false);
  const inputRef = useRef(null);

  const muatStasiun = () =>
    api.get("/iklim/stations")
      .then((r) => setDaftarStasiun(r.data.detail || []))
      .catch(() => {});

  useEffect(() => {
    muatStasiun();
  }, []);

  const pilihFile = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setHasil({ sukses: false, pesan: "Hanya berkas Excel (.xlsx atau .xls) yang diterima" });
      return;
    }
    setFile(f);
    setHasil(null);
  };

  const kirim = async () => {
    if (!file) {
      setHasil({ sukses: false, pesan: "Pilih berkas terlebih dahulu" });
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    if (stasiun) fd.append("station", stasiun);
    fd.append("strict", String(modeKetat));

    setLoading(true);
    setHasil(null);
    try {
      const { data } = await api.post("/iklim/upload", fd);
      setHasil({ sukses: true, pesan: data.message, data });
      if (data.stasiunBaru?.length) muatStasiun();
    } catch (err) {
      setHasil({
        sukses: false,
        pesan: pesanError(err, "Unggahan gagal"),
        data: err.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const d = hasil?.data;
  const v = d?.validasi;

  return (
    <>
      <PageHead title="Unggah Data" sub="Berkas Excel dari logger AWS" />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <div>
          <div className="bg-panel border border-rule rounded-card px-3.5 py-3 mb-3">
            <Field label="Stasiun tujuan" className="max-w-[280px]">
              <Select value={stasiun} onChange={(e) => setStasiun(e.target.value)}>
                <option value="">Dari kolom Stasiun di berkas</option>
                {daftarStasiun.map((s) => (
                  <option key={s.NAMA} value={s.NAMA}>{s.LABEL || s.NAMA}</option>
                ))}
              </Select>
            </Field>
            <p className="m-0 mt-1.5 text-[11px] text-ink-3">
              Berkas satu stasiun tanpa kolom <span className="num">Stasiun</span> wajib memilih
              stasiun di sini. Berkas dengan kolom itu boleh berisi banyak stasiun.
            </p>
          </div>

          {/* ------------------------------------------------ area jatuhkan */}
          <div
            onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
            onDragLeave={() => setSeret(false)}
            onDrop={(e) => { e.preventDefault(); setSeret(false); pilihFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label="Pilih atau jatuhkan berkas Excel"
            className={`border-[1.5px] border-dashed rounded-[10px] px-5 py-8 text-center bg-panel
                        cursor-pointer transition-colors ${
                          seret ? "border-accent-line bg-soft" : "border-rule-2 hover:border-ink-3"
                        }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(e) => pilihFile(e.target.files?.[0])}
            />
            <div className="text-[26px] text-ink-3 mb-2.5">↥</div>
            {file ? (
              <>
                <div className="text-[14px] font-semibold mb-1">{file.name}</div>
                <div className="text-[12px] text-ink-3">
                  {(file.size / 1024).toFixed(0)} KB · siap diproses
                </div>
              </>
            ) : (
              <>
                <div className="text-[14px] font-semibold mb-1">
                  Jatuhkan berkas di sini, atau klik untuk memilih
                </div>
                <div className="text-[12px] text-ink-3">Format .xlsx atau .xls, maksimal 10 MB</div>
              </>
            )}
          </div>

          {/* -------------------------------------------------- mode ketat */}
          <label className="flex items-start gap-2.5 px-3.5 py-3 bg-panel border border-rule
                            rounded-card mt-3 text-[12px] text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modeKetat}
              onChange={(e) => setModeKetat(e.target.checked)}
              className="mt-0.5 accent-[var(--accent-line)] w-[15px] h-[15px] shrink-0"
            />
            <span>
              <b className="text-ink">Mode ketat</b>, batalkan seluruh unggahan bila ada nilai di
              luar batas fisik, agar berkas sumber diperbaiki lebih dulu. Tanpa ini data tetap
              disimpan dan temuannya hanya dilaporkan.
            </span>
          </label>

          <Button
            variant="primary"
            onClick={kirim}
            disabled={loading}
            className="mt-3 w-full justify-center py-2.5"
          >
            {loading ? "Mengunggah…" : "Unggah sekarang"}
          </Button>

          {/* ------------------------------------------------------- hasil */}
          {hasil && (
            <div className="bg-panel border border-rule rounded-card overflow-hidden mt-3">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-rule">
                <Badge tone={hasil.sukses ? "good" : "crit"}>
                  {hasil.sukses ? "BERHASIL" : "DIBATALKAN"}
                </Badge>
                <div className="text-[13px] font-bold min-w-0">
                  {hasil.pesan}
                  {!hasil.sukses && modeKetat && v?.jumlahError > 0 && (
                    <small className="block font-normal text-[11px] text-ink-3 mt-0.5">
                      Tidak ada data yang ditulis ke basis data
                    </small>
                  )}
                </div>
              </div>

              {d?.ringkasan && (
                <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-rule">
                  {[
                    ["Total baris", d.ringkasan.totalBaris],
                    ["Diproses", d.ringkasan.diproses],
                    ["Ditambah", d.ringkasan.ditambah],
                    ["Diperbarui", d.ringkasan.diperbarui],
                    ["Dilewati", d.ringkasan.dilewati],
                  ].map(([k, val]) => (
                    <div key={k} className="px-3.5 py-2.5 border-r border-rule last:border-r-0">
                      <div className="label-caps mb-1">{k}</div>
                      <div className="num text-[17px] font-semibold">{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {d?.perStasiun?.length > 1 && (
                <div className="max-h-[200px] overflow-y-auto border-b border-rule">
                  {d.perStasiun.map((s) => (
                    <div key={s.stasiun} className="flex items-center gap-2.5 px-4 py-2 border-b border-rule last:border-b-0 text-[12px]">
                      <span className="font-semibold min-w-0 truncate">{s.stasiun}</span>
                      {d.stasiunBaru?.includes(s.stasiun) && <Badge tone="warn">baru</Badge>}
                      <span className="ml-auto num text-[11.5px] text-ink-3 shrink-0">
                        {s.baris} baris · {s.dari} – {s.sampai}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {d?.stasiunBaru?.length > 0 && (
                <div className="px-4 py-2.5 text-[11.5px] text-ink-2 border-b border-rule">
                  {d.stasiunBaru.length} stasiun baru didaftarkan:{" "}
                  <span className="num">{d.stasiunBaru.join(", ")}</span>. Bila ada yang tidak
                  dikenal, periksa ejaan nama di berkas.
                </div>
              )}

              {d?.barisDuplikat?.length > 0 && (
                <div className="px-4 py-3 border-b border-rule">
                  <div className="label-caps mb-2">Stasiun dan tanggal ganda</div>
                  {d.barisDuplikat.map((b, i) => (
                    <div key={i} className="text-[11.5px] text-crit">
                      Baris {b.baris} sama dengan baris {b.sama} ({b.stasiun}, {b.tanggal})
                    </div>
                  ))}
                  {d.totalDuplikat > d.barisDuplikat.length && (
                    <div className="text-[11.5px] text-ink-3 mt-1">
                      +{d.totalDuplikat - d.barisDuplikat.length} baris lainnya
                    </div>
                  )}
                </div>
              )}

              {d?.kolomYangDitemukan && (
                <div className="px-4 py-2.5 text-[11.5px] text-ink-2 border-b border-rule">
                  Kolom terbaca: <span className="num">{d.kolomYangDitemukan.join(", ")}</span>
                </div>
              )}

              {v?.temuan?.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto">
                  {v.temuan.map((t, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-rule last:border-b-0">
                      <Badge tone={t.tingkat === "error" ? "crit" : "warn"}>Baris {t.baris}</Badge>
                      <div className="text-[12px] min-w-0">
                        <span className="font-semibold">{t.field} = <span className="num">{t.nilai}</span></span>
                        <div className="text-[10.5px] text-ink-3 mt-0.5 leading-relaxed">{t.pesan}</div>
                      </div>
                    </div>
                  ))}
                  {v.adaLagi > 0 && (
                    <div className="px-4 py-2.5 text-[11.5px] text-ink-3">
                      +{v.adaLagi} temuan lainnya
                    </div>
                  )}
                </div>
              )}

              {d?.barisDilewati?.length > 0 && (
                <div className="px-4 py-3 border-t border-rule">
                  <div className="label-caps mb-2">Baris dilewati</div>
                  {d.barisDilewati.map((b, i) => (
                    <div key={i} className="text-[11.5px] text-warn">
                      Baris {b.baris}: {b.alasan} (&ldquo;{b.nilai}&rdquo;)
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- petunjuk */}
        <div className="flex flex-col gap-3 self-start">
          <Panel title="Format berkas">
            <div className="text-[12px] text-ink-2 leading-relaxed mt-1.5">
              <p className="m-0 mb-2">
                Kolom wajib: <span className="num text-ink">Date</span>,{" "}
                <span className="num text-ink">TN</span>,{" "}
                <span className="num text-ink">TX</span>,{" "}
                <span className="num text-ink">TM</span>
              </p>
              <p className="m-0 mb-2">
                Opsional: <span className="num">UN, UX, UM, RR, GIX, VT, RG</span>
              </p>
              <p className="m-0 mb-2">
                Banyak stasiun: tambahkan kolom <span className="num text-ink">Stasiun</span>.
                Koordinat boleh ditaruh di sheet <span className="num">Stasiun</span>
                {" "}(<span className="num">Wilayah, Tipe, Lintang, Bujur, Elevasi_m</span>).
              </p>
              <p className="m-0 text-ink-3">
                Nama stasiun tidak pernah diambil dari nama berkas.
              </p>
            </div>
          </Panel>

          <div className="px-3.5 py-3 bg-panel border border-rule rounded-card text-[12px] text-ink-2 leading-relaxed">
            <div className="flex items-start gap-2.5 mb-2.5">
              <span className="w-[15px] h-[15px] rounded border-[1.5px] border-accent-line bg-accent-line
                               text-on-accent grid place-items-center text-[9px] shrink-0 mt-px">✓</span>
              <span>Mengunggah ulang periode yang sama akan <b className="text-ink">memperbarui</b>, bukan menggandakan.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-[15px] h-[15px] rounded border-[1.5px] border-accent-line bg-accent-line
                               text-on-accent grid place-items-center text-[9px] shrink-0 mt-px">✓</span>
              <span>Baris dengan tanggal tidak terbaca <b className="text-ink">dilewati dan dilaporkan</b>, bukan diisi tanggal hari ini.</span>
            </div>
          </div>

          {!hasil && (
            <Panel>
              <EmptyState icon="◌" title="Belum ada unggahan">
                Hasil pemeriksaan akan muncul di sini setelah berkas diproses.
              </EmptyState>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
