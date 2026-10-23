"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Stat,
  Modal,
  Field,
  Textarea,
  PageHeader,
  SectionTitle,
  LaporanBadge,
  Progress,
  EmptyState,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import {
  IconUpload,
  IconFile,
  IconCheck,
  IconStar,
  IconEdit,
  IconX,
} from "@/components/icons";
import { RiwayatLaporan } from "@/components/timeline";
import { ASPEK_PENILAIAN } from "@/lib/nilai";
import { formatTanggal } from "@/lib/calc";
import { useApi, api } from "@/lib/api";
import { UnggahBerkas } from "@/components/unggah-berkas";

const MICRO = "text-[11px] font-medium text-ink/65";

const TAHAP_LAPORAN = { draft: 25, terkirim: 50, revisi: 75, diterima: 100 };
const TONE_PROGRESS = {
  draft: "bg-paper",
  terkirim: "bg-sun",
  revisi: "bg-tang",
  diterima: "bg-mint",
};

function namaTanpaEkstensi(nama) {
  return nama.replace(/\.[^.]+$/, "");
}

function formatNilai(v) {
  return Number(v).toFixed(1).replace(".", ",");
}

function formatAngka(v) {
  return String(v).replace(".", ",");
}

function GagalMemuat({ pesan, onCoba }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/30 p-4 sm:p-5"
    >
      <p className="font-display text-base leading-tight">Data gagal dimuat</p>
      <p className="mt-1 text-sm font-semibold text-ink/75">{pesan}</p>
      <div className="mt-3">
        <Btn tone="ink" size="sm" onClick={onCoba}>
          Coba lagi
        </Btn>
      </div>
    </div>
  );
}

export default function LaporanPage() {
  const { data, loading, error, reload } = useApi("/api/laporan");
  const daftar = data?.laporan ?? [];

  const [sesi, setSesi] = useState([]);
  const [picked, setPicked] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [revisiId, setRevisiId] = useState(null);
  const [revisi, setRevisi] = useState({ berkas: [], jawaban: "" });
  const [detailId, setDetailId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingKirim, setPendingKirim] = useState(false);
  const [pendingRevisi, setPendingRevisi] = useState(false);
  const [toast, setToast] = useState("");

  const toastTimer = useRef(null);
  const detailReq = useRef(0);

  const revisiTarget = daftar.find((l) => l.id === revisiId) ?? null;
  const detail = detailData?.laporan ?? daftar.find((l) => l.id === detailId) ?? null;
  const riwayatDetail = detailData?.riwayat ?? [];
  const terbaru = daftar[0] ?? null;
  const progresLaporan = terbaru
    ? TAHAP_LAPORAN[terbaru.status] ?? 0
    : 0;
  const perluRevisi = daftar.filter((l) => l.status === "revisi").length;

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function bukaDetail(l) {
    const seq = ++detailReq.current;
    setDetailId(l.id);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await api(`/api/laporan/${l.id}`);
      if (detailReq.current === seq) setDetailData(res);
    } catch (err) {
      if (detailReq.current === seq) showToast(err.message);
    } finally {
      if (detailReq.current === seq) setDetailLoading(false);
    }
  }

  function tutupDetail() {
    detailReq.current++;
    setDetailId(null);
    setDetailData(null);
    setDetailLoading(false);
  }

  async function kirimLaporan(e) {
    e.preventDefault();
    if (!picked.length || pendingKirim) return;
    setPendingKirim(true);
    try {
      const res = await api("/api/laporan", {
        method: "POST",
        body: {
          judul: namaTanpaEkstensi(picked[0].nama),
          berkasIds: picked.map((b) => b.id),
        },
      });
      setSesi((prev) => [...prev, res.laporan.id]);
      const jumlah = picked.length;
      setPicked([]);
      showToast(`${jumlah} berkas terkirim, menunggu review pembimbing`);
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPendingKirim(false);
    }
  }

  function bukaRevisi(id) {
    setRevisiId(id);
    setRevisi({ berkas: [], jawaban: "" });
  }

  async function kirimRevisi(e) {
    e.preventDefault();
    if (!revisiTarget || pendingRevisi) return;
    if (!revisi.berkas.length) {
      showToast("Pilih berkas revisi terlebih dahulu");
      return;
    }
    if (!revisi.jawaban.trim()) {
      showToast("Tulis jawaban atas catatan penguji terlebih dahulu");
      return;
    }
    setPendingRevisi(true);
    try {
      const res = await api("/api/laporan", {
        method: "POST",
        body: {
          judul: revisiTarget.judul,
          berkasIds: revisi.berkas.map((b) => b.id),
          revisiDari: revisiTarget.id,
          jawaban: revisi.jawaban.trim(),
        },
      });
      setSesi((prev) => [...prev, res.laporan.id]);
      setRevisi({ berkas: [], jawaban: "" });
      setRevisiId(null);
      showToast(`Laporan v${res.laporan.versi} dikirim ke pembimbing`);
      reload();
      bukaDetail({ id: res.laporan.id });
    } catch (err) {
      showToast(err.message);
    } finally {
      setPendingRevisi(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Laporan PKL"
        desc="Laporan mingguan dan akhir, beserta catatan pembimbing."
        action={
          <div className="flex items-center gap-3">
            <Badge tone="yellow">{daftar.length} Berkas</Badge>
            <Btn
              tone="ink"
              onClick={() =>
                document.getElementById("unggah-laporan")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
            >
              <IconUpload size={16} /> Unggah Berkas
            </Btn>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {}
        <div>
          <div id="unggah-laporan" />
          <UnggahBerkas
            berkas={picked}
            onChange={setPicked}
            onError={showToast}
            label="Berkas laporan"
            hint="Gambar, PDF, DOCX, XLSX, atau PPT, maksimal 10 MB per berkas."
          />

          {picked.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-brutal bg-paper p-4">
              <p className={MICRO}>Siap dikirim ({picked.length})</p>
              <Btn tone="ink" onClick={kirimLaporan} disabled={pendingKirim}>
                <IconUpload size={16} />{" "}
                {pendingKirim ? "Mengirim…" : "Kirim ke Pembimbing"}
              </Btn>
            </div>
          ) : null}

          {}
          <div className="mt-6">
            <SectionTitle
              right={
                <span className={MICRO}>
                  {daftar.length} berkas milikmu
                </span>
              }
            >
              Berkas Laporan Saya
            </SectionTitle>

            {loading ? (
              <LoadingBlock label="Memuat laporan…" />
            ) : error ? (
              <GagalMemuat pesan={error.message} onCoba={reload} />
            ) : daftar.length === 0 ? (
              <EmptyState
                title="Belum ada laporan"
                desc="Unggah laporan pertama lewat kotak di atas."
                action={
                  <Btn
                    tone="ink"
                    onClick={() =>
                      document.getElementById("unggah-laporan")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                    }
                  >
                    <IconUpload size={16} /> Unggah Berkas
                  </Btn>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {daftar.map((l) => (
                  <Panel key={l.id} className="flex flex-col p-4 sm:p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brutal bg-paper shadow-brutal-sm">
                        <IconFile size={18} />
                      </span>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge tone="white">v{l.versi}</Badge>
                        <LaporanBadge status={l.status} />
                      </div>
                    </div>

                    <h3 className="font-display text-base leading-tight">
                      {l.judul}
                    </h3>

                    <p className={`mt-1.5 ${MICRO}`}>
                      {l.ukuran || "-"} · {l.halaman ?? "-"} halaman ·{" "}
                      {l.diperbarui ? formatTanggal(l.diperbarui, true) : "-"}
                    </p>

                    {l.status === "revisi" && l.feedback ? (
                      <p className="mt-3 flex items-start gap-2 rounded-brutal bg-tang/40 p-2.5 text-xs font-semibold">
                        <IconEdit size={14} className="mt-0.5 shrink-0" />
                        <span>Catatan penguji: “{l.feedback}”</span>
                      </p>
                    ) : l.feedback ? (
                      <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-ink/70">
                        <IconStar size={14} className="mt-0.5 shrink-0" />
                        <span>“{l.feedback}”</span>
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Btn tone="white" size="sm" onClick={() => bukaDetail(l)}>
                        <IconFile size={14} /> Detail
                      </Btn>
                      {l.status === "revisi" ? (
                        <Btn
                          tone="white"
                          size="md"
                          onClick={() => bukaRevisi(l.id)}
                        >
                          <IconEdit size={14} /> Lanjutkan Revisi
                        </Btn>
                      ) : null}
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </div>
        </div>

        {}
        <div className="grid content-start gap-5">
          <Panel className="p-4 sm:p-5">
            <SectionTitle
              right={
                terbaru ? (
                  <LaporanBadge status={terbaru.status} />
                ) : (
                  <Badge tone="white">Belum ada</Badge>
                )
              }
            >
              Progress Laporan Akhir
            </SectionTitle>
            <div className="mb-2 flex items-end justify-between gap-3 text-sm font-bold">
              <span className="min-w-0 truncate">
                {terbaru ? `${terbaru.judul} · v${terbaru.versi}` : "Belum ada laporan"}
              </span>
              <span className="shrink-0 font-display text-lg">{progresLaporan}%</span>
            </div>
            <Progress
              value={progresLaporan}
              tone={terbaru ? TONE_PROGRESS[terbaru.status] ?? "bg-candy" : "bg-paper"}
            />
            {terbaru?.feedback ? (
              <p className="mt-3 flex items-start gap-2 rounded-brutal bg-tang/40 p-2.5 text-xs font-semibold">
                <IconEdit size={14} className="mt-0.5 shrink-0" />
                <span>Catatan penguji: “{terbaru.feedback}”</span>
              </p>
            ) : null}
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle right={<IconStar size={18} />}>
              Rubrik Penilaian
            </SectionTitle>
            {terbaru?.penilaian ? (
              <>
                <ul className="grid gap-2">
                  {ASPEK_PENILAIAN.map((a) => (
                    <li
                      key={a.kode}
                      className="flex items-center justify-between gap-3 rounded-brutal bg-paper px-3 py-2"
                    >
                      <span className="text-xs font-bold tracking-wide">
                        {a.label}
                      </span>
                      <span className="font-display text-base">
                        {formatAngka(terbaru.penilaian[a.kode])}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/15 pt-3">
                  <span className={MICRO}>Total Nilai</span>
                  <span className="font-display text-3xl leading-none">
                    {formatNilai(terbaru.nilaiAkhir)}
                    <span className="text-sm text-ink/65"> /100</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-ink/65">
                  Dinilai pembimbing sekolah saat laporan “{terbaru.judul}”
                  diterima.
                </p>
              </>
            ) : (
              <p className="rounded-brutal border bg-paper p-3 text-xs font-semibold text-ink/65">
                Belum ada penilaian. Rubrik diisi pembimbing sekolah saat
                laporan diterima.
              </p>
            )}
          </Panel>
        </div>
      </div>

      {}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Berkas Saya"
          value={daftar.length}
          sub={`${daftar.filter((l) => sesi.includes(l.id)).length} unggahan sesi ini`}
          tone="bg-sun"
          icon={<IconFile size={18} />}
        />
        <Stat
          label="Perlu Revisi"
          value={perluRevisi}
          sub="Catatan dari pembimbing"
          tone="bg-tang"
          icon={<IconUpload size={18} />}
        />
        <Stat
          label="Diterima"
          value={daftar.filter((l) => l.status === "diterima").length}
          sub="Laporan selesai direview"
          tone="bg-marine"
          icon={<IconCheck size={18} />}
        />
      </div>

      {}
      <Modal
        open={detail !== null}
        onClose={tutupDetail}
        title="Detail Laporan"
        footer={
          <>
            <Btn tone="white" onClick={tutupDetail}>
              Tutup
            </Btn>
            {detail?.status === "revisi" ? (
              <Btn
                tone="ink"
                onClick={() => {
                  const id = detail.id;
                  tutupDetail();
                  bukaRevisi(id);
                }}
              >
                <IconEdit size={14} /> Lanjutkan Revisi
              </Btn>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="grid gap-3">
            <div className="rounded-brutal bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={MICRO}>Judul laporan</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="white">v{detail.versi}</Badge>
                  <LaporanBadge status={detail.status} />
                </div>
              </div>
              <p className="font-display mt-1 text-base leading-tight">
                {detail.judul}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-brutal bg-white p-3">
                <p className={MICRO}>Ukuran berkas</p>
                <p className="mt-1 text-sm font-bold">{detail.ukuran || "-"}</p>
              </div>
              <div className="rounded-brutal bg-white p-3">
                <p className={MICRO}>Terakhir diperbarui</p>
                <p className="mt-1 text-sm font-bold">
                  {detail.diperbarui
                    ? formatTanggal(detail.diperbarui, true)
                    : "-"}
                </p>
              </div>
            </div>

            <div>
              <p className={`mb-1.5 ${MICRO}`}>Berkas laporan</p>
              {detail.berkas?.length ? (
                <ul className="grid gap-1.5">
                  {detail.berkas.map((b) => (
                    <li key={b.id}>
                      <a
                        href={b.url}
                        className="flex items-center gap-2 rounded-brutal bg-paper px-3 py-2 text-sm font-normal underline decoration-1 underline-offset-2 hover:text-marine"
                      >
                        <IconFile size={15} />
                        <span className="min-w-0 flex-1 truncate">{b.nama}</span>
                        <span className="shrink-0 text-xs text-ink/60">
                          {b.ukuranTeks}
                        </span>
                        <span className="shrink-0 text-xs font-medium">Unduh</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-normal text-ink/60">
                  Berkas versi ini tidak tersimpan di server.
                </p>
              )}
            </div>

            <div className="rounded-brutal bg-tang/40 p-3">
              <p className={`flex items-center gap-1.5 ${MICRO}`}>
                <IconEdit size={13} /> Catatan feedback dari sekolah
              </p>
              <p className="mt-1 text-sm font-semibold">
                {detail.feedback || "Belum ada catatan dari pembimbing."}
              </p>
            </div>

            <div className="rounded-brutal bg-mint/40 p-3">
              <p className={`flex items-center gap-1.5 ${MICRO}`}>
                <IconCheck size={13} /> Jawaban yang pernah kamu kirim
              </p>
              <p className="mt-1 text-sm font-semibold">
                {detail.jawaban || "Belum ada jawaban yang dikirim."}
              </p>
            </div>

            {detail.penilaian ? (
              <div className="rounded-brutal bg-grape/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={MICRO}>Rubrik penilaian pembimbing</p>
                  <span className="font-display text-xl leading-none">
                    {formatNilai(detail.nilaiAkhir)}
                    <span className="text-xs text-ink/65"> /100</span>
                  </span>
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {ASPEK_PENILAIAN.map((a) => (
                    <li
                      key={a.kode}
                      className="flex items-center justify-between gap-3 text-xs font-semibold"
                    >
                      <span>{a.label}</span>
                      <span className="font-display text-sm">
                        {formatAngka(detail.penilaian[a.kode])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className={`mb-1.5 ${MICRO}`}>Riwayat laporan</p>
              {detailLoading && !detailData ? (
                <LoadingBlock label="Memuat riwayat…" />
              ) : (
                <RiwayatLaporan riwayat={riwayatDetail} />
              )}
            </div>

            <p className="text-xs font-normal text-ink/60">
              Gambar, PDF, DOCX, XLSX, atau PPT. Tipe diperiksa dari isinya,
              bukan namanya.
            </p>
          </div>
        ) : null}
      </Modal>

      {}
      <Modal
        open={revisiTarget !== null}
        onClose={() => setRevisiId(null)}
        title="Lanjutkan Revisi"
        footer={
          <>
            <Btn tone="white" onClick={() => setRevisiId(null)}>
              Batal
            </Btn>
            <Btn tone="ink" type="submit" form="form-revisi" disabled={pendingRevisi}>
              {pendingRevisi ? "Mengirim…" : "Kirim Revisi"}
            </Btn>
          </>
        }
      >
        {revisiTarget ? (
          <form id="form-revisi" onSubmit={kirimRevisi} className="grid gap-4">
            <div className="rounded-brutal bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={MICRO}>Laporan direvisi</p>
                <Badge tone="white">v{revisiTarget.versi}</Badge>
              </div>
              <p className="font-display mt-1 text-base leading-tight">
                {revisiTarget.judul}
              </p>
            </div>

            <div>
              <p className={`mb-1.5 ${MICRO}`}>Berkas laporan</p>
              {detail.berkas?.length ? (
                <ul className="grid gap-1.5">
                  {detail.berkas.map((b) => (
                    <li key={b.id}>
                      <a
                        href={b.url}
                        className="flex items-center gap-2 rounded-brutal bg-paper px-3 py-2 text-sm font-normal underline decoration-1 underline-offset-2 hover:text-marine"
                      >
                        <IconFile size={15} />
                        <span className="min-w-0 flex-1 truncate">{b.nama}</span>
                        <span className="shrink-0 text-xs text-ink/60">
                          {b.ukuranTeks}
                        </span>
                        <span className="shrink-0 text-xs font-medium">Unduh</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-normal text-ink/60">
                  Berkas versi ini tidak tersimpan di server.
                </p>
              )}
            </div>

            <div className="rounded-brutal bg-tang/40 p-3">
              <p className={`flex items-center gap-1.5 ${MICRO}`}>
                <IconEdit size={13} /> Catatan penguji (wajib dijawab)
              </p>
              <p className="mt-1 text-sm font-semibold">
                “{revisiTarget.feedback || "Tidak ada catatan."}”
              </p>
            </div>

            <UnggahBerkas
              berkas={revisi.berkas}
              onChange={(next) => setRevisi((r) => ({ ...r, berkas: next }))}
              onError={showToast}
              label="Berkas revisi"
              hint="Berkas versi baru, maksimal 10 MB."
            />

            <Field label="Jawaban atas catatan penguji">
              <Textarea
                rows={4}
                data-autofocus
                value={revisi.jawaban}
                onChange={(e) =>
                  setRevisi((r) => ({ ...r, jawaban: e.target.value }))
                }
                placeholder="Tuliskan perubahan yang sudah kamu lakukan…"
                required
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
