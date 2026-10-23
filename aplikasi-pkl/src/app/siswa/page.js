"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Panel,
  Btn,
  Stat,
  PageHeader,
  SectionTitle,
  StatusBadge,
  Field,
  Input,
  Textarea,
  Progress,
  Toast,
  VerifySteps,
  EmptyState,
  LoadingBlock,
  LAPORAN_STATUS,
} from "@/components/ui";
import {
  IconBook,
  IconClock,
  IconCheck,
  IconUpload,
  IconPin,
  IconArrow,
  IconEdit,
  IconFile,
  IconX,
  IconBuilding,
} from "@/components/icons";
import { useApi, api } from "@/lib/api";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { formatTanggal, kalenderHadirDari, rekapHadirDari, hitungStatus } from "@/lib/calc";
import {
  useHariIni,
  isoHariIni,
  formatTanggalPanjang,
  formatTanggalPendek,
  NAMA_BULAN,
} from "@/lib/tanggal";

const MICRO = "text-[11px] font-medium text-ink/65";
const MICRO_PUTIH = "text-[11px] font-medium text-white";

const TAHAP_LAPORAN = { draft: 25, terkirim: 50, revisi: 75, diterima: 100 };
const TONE_PROGRESS = {
  draft: "bg-paper",
  terkirim: "bg-sun",
  revisi: "bg-tang",
  diterima: "bg-mint",
};

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

export default function SiswaDashboard() {
  const hariIni = useHariIni();
  const meQuery = useApi("/api/auth/me");
  const jurnalQuery = useApi("/api/jurnal");
  const laporanQuery = useApi("/api/laporan");
  const dudiQuery = useApi("/api/dudi?mine=1");

  const [form, setForm] = useState({
    judul: "",
    kegiatan: "",
    masuk: "07:55",
    keluar: "16:30",
  });
  const [pending, setPending] = useState(false);
  const [berkas, setBerkas] = useState([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const jurnal = jurnalQuery.data?.jurnal ?? [];
  const laporan = laporanQuery.data?.laporan ?? [];
  const dudi = dudiQuery.data?.dudi ?? null;

  const [tahunSekarang, bulanAngka] = hariIni ? hariIni.split("-").map(Number) : [0, 0];
  const bulanSekarang = hariIni ? bulanAngka - 1 : null;
  const namaSaya = meQuery.data?.user?.nama ?? "";
  const sapaan = namaSaya ? `Halo, ${namaSaya.split(" ")[0]}!` : "Halo!";
  const deskripsi = hariIni
    ? `${formatTanggalPanjang(hariIni)}${
        dudi ? `. Tempat praktik: ${dudi.nama}.` : "."
      }`
    : "";

  const gagal = jurnalQuery.error || laporanQuery.error || dudiQuery.error;
  const ringkasMemuat = jurnalQuery.loading || laporanQuery.loading;
  const ringkasGagal = jurnalQuery.error || laporanQuery.error;

  const terakhir = jurnal.slice(0, 4);
  const jurnalBulanIni = hariIni
    ? rekapHadirDari(jurnal, null, tahunSekarang, bulanSekarang)
    : 0;
  const status = hitungStatus(jurnal);
  const menunggu = status.menunggu_dudi + status.menunggu_sekolah;
  const cells = hariIni
    ? kalenderHadirDari(jurnal, tahunSekarang, bulanSekarang, hariIni)
    : [];
  const hadir = cells.filter((c) => c.state === "hadir").length;
  const kerja = cells.filter((c) => c.state === "hadir" || c.state === "alpa").length;
  const persen = kerja ? Math.round((hadir / kerja) * 100) : 0;
  const perluRevisi = laporan.filter((l) => l.status === "revisi").length;
  const laporanTerbaru = laporan[0] ?? null;
  const persenLaporan = laporanTerbaru
    ? TAHAP_LAPORAN[laporanTerbaru.status] ?? 0
    : 0;

  const stats = [
    {
      label: bulanSekarang != null ? `Jurnal ${NAMA_BULAN[bulanSekarang]}` : "Jurnal bulan ini",
      value: jurnalBulanIni,
      sub: "Target 20 hari praktik",
      tone: "bg-sun",
      icon: <IconBook size={18} />,
    },
    {
      label: "Menunggu verifikasi",
      value: menunggu,
      sub: `${status.menunggu_dudi} di DUDI, ${status.menunggu_sekolah} di sekolah`,
      tone: "bg-marine",
      icon: <IconClock size={18} />,
    },
    { label: "Kehadiran", value: `${persen}%`, sub: `${hadir} dari ${kerja} hari kerja`, tone: "bg-mint", icon: <IconCheck size={18} /> },
    { label: "Laporan", value: perluRevisi, sub: "Menunggu revisi", tone: "bg-candy", icon: <IconUpload size={18} /> },
  ];

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function cobaLagi() {
    jurnalQuery.reload();
    laporanQuery.reload();
    dudiQuery.reload();
  }

  function fokusTulisJurnal() {
    const el = document.getElementById("jurnal-hari-ini");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector("input")?.focus({ preventScroll: true });
  }

  async function submitJurnal(e) {
    e.preventDefault();
    if (!form.judul.trim() || pending) return;
    setPending(true);
    try {
      await api("/api/jurnal", {
        method: "POST",
        body: {
          judul: form.judul.trim(),
          tanggal: isoHariIni(),
          masuk: form.masuk,
          keluar: form.keluar,
          kegiatan: form.kegiatan.trim() || "-",
          berkasIds: berkas.map((b) => b.id),
        },
      });
      setBerkas([]);
      setForm({ judul: "", kegiatan: "", masuk: "07:55", keluar: "16:30" });
      showToast("Jurnal tersimpan dan dikirim ke pembimbing DUDI");
      jurnalQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={sapaan}
        desc={deskripsi}
        action={
          <Btn tone="ink" onClick={fokusTulisJurnal}>
            <IconEdit size={16} /> Tulis Jurnal Hari Ini
          </Btn>
        }
      />

      {gagal ? (
        <div className="mb-6">
          <GagalMemuat pesan={gagal.message} onCoba={cobaLagi} />
        </div>
      ) : null}

      {}
      {ringkasGagal ? null : ringkasMemuat ? (
        <LoadingBlock label="Memuat ringkasan…" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-sun px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <IconEdit size={18} /> Tulis Jurnal Hari Ini
            </h2>
            <span
              className={`rounded-full bg-white px-2.5 py-0.5 ${MICRO}`}
            >
              {hariIni ? formatTanggalPendek(hariIni) : ""}
            </span>
          </div>

          <form
            id="jurnal-hari-ini"
            onSubmit={submitJurnal}
            className="grid gap-4 p-4 sm:p-5"
          >
            <Field label="Judul Kegiatan">
              <Input
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="cth. Membuat halaman laporan"
                required
              />
            </Field>

            <Field label="Uraian Kegiatan" hint="Cakup pekerjaan, kendala, dan hasil yang dicapai.">
              <Textarea
                rows={4}
                value={form.kegiatan}
                onChange={(e) => setForm({ ...form, kegiatan: e.target.value })}
                placeholder="Tulis apa saja yang kamu kerjakan hari ini…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Jam Masuk">
                <Input
                  type="time"
                  value={form.masuk}
                  onChange={(e) => setForm({ ...form, masuk: e.target.value })}
                />
              </Field>
              <Field label="Jam Keluar">
                <Input
                  type="time"
                  value={form.keluar}
                  onChange={(e) => setForm({ ...form, keluar: e.target.value })}
                />
              </Field>
            </div>

            {}
            <div>
              <span className="mb-1.5 block text-xs font-bold tracking-wide">
                Lampiran bukti (opsional)
              </span>
              <UnggahBerkas
                berkas={berkas}
                onChange={setBerkas}
                onError={showToast}
                label="Lampiran bukti (opsional)"
                hint="Gambar, PDF, DOCX, XLSX, atau PPT, maksimal 10 MB per berkas."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Btn tone="ink" type="submit" disabled={pending}>
                {pending ? "Menyimpan…" : "Kirim ke Pembimbing DUDI"}
              </Btn>
              <span className={MICRO}>Verifikasi: DUDI → Sekolah</span>
            </div>
          </form>
        </Panel>

        {}
        <div className="grid gap-5">
          {}
          {dudiQuery.loading ? (
            <LoadingBlock label="Memuat tempat PKL…" />
          ) : dudi ? (
            <Panel tone="bg-marine" className="p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className={MICRO_PUTIH}>Tempat PKL saya</p>
                  <h3 className="font-display text-xl leading-tight text-white">
                    {dudi.nama}
                  </h3>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm">
                  <IconPin size={18} />
                </span>
              </div>
              <p className="text-sm font-semibold text-white">{dudi.alamat}</p>
              <p
                className={`mt-1 flex flex-wrap items-center gap-1.5 ${MICRO_PUTIH}`}
              >
                <IconClock size={13} /> {dudi.jam} · Pembimbing: {dudi.pembimbing}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Btn tone="white" size="sm" href="/siswa/lokasi" className="w-full">
                  Lihat Lokasi <IconArrow size={14} />
                </Btn>
              </div>
            </Panel>
          ) : (
            <EmptyState
              title="Tempat PKL belum diatur"
              desc="Akunmu belum terhubung ke mitra. Hubungi pembimbing sekolah."
            />
          )}

          {}
          <Panel className="p-4 sm:p-5">
            <SectionTitle right={<Link href="/siswa/laporan" className="text-xs font-bold underline decoration-[3px] underline-offset-4">Buka</Link>}>
              Progress Laporan Akhir
            </SectionTitle>
            {laporanQuery.loading ? (
              <LoadingBlock label="Memuat progress laporan…" />
            ) : (
              <>
                <div className="mb-2 flex items-end justify-between gap-3 text-sm font-bold">
                  <span className="min-w-0 truncate">
                    {laporanTerbaru
                      ? `${LAPORAN_STATUS[laporanTerbaru.status]?.label ?? laporanTerbaru.status} · v${laporanTerbaru.versi}`
                      : "Belum ada laporan"}
                  </span>
                  <span className="shrink-0 font-display text-lg">{persenLaporan}%</span>
                </div>
                <Progress
                  value={persenLaporan}
                  tone={laporanTerbaru ? TONE_PROGRESS[laporanTerbaru.status] ?? "bg-candy" : "bg-paper"}
                />
                {laporanTerbaru?.feedback ? (
                  <p className="mt-3 flex items-start gap-2 rounded-brutal bg-tang/40 p-2.5 text-xs font-semibold">
                    <IconEdit size={14} className="mt-0.5 shrink-0" />
                    <span>Catatan penguji: “{laporanTerbaru.feedback}”</span>
                  </p>
                ) : null}
              </>
            )}
          </Panel>
        </div>
      </div>

      {}
      <div className="mt-8">
        <SectionTitle
          right={
            <Link href="/siswa/jurnal" className="text-xs font-bold underline decoration-[3px] underline-offset-4">
              Semua jurnal →
            </Link>
          }
        >
          Jurnal Terbaru
        </SectionTitle>

        {jurnalQuery.loading ? (
          <LoadingBlock label="Memuat jurnal terbaru…" />
        ) : jurnalQuery.error ? null : terakhir.length === 0 ? (
          <EmptyState
            title="Belum ada jurnal hari ini"
            desc="Mulai catat kegiatan, kehadiranmu ikut terisi."
            action={
              <Btn tone="ink" onClick={fokusTulisJurnal}>
                <IconEdit size={16} /> Tulis Jurnal
              </Btn>
            }
          />
        ) : (
          <div className="grid gap-4">
            {terakhir.map((j) => (
              <Panel key={j.id} className="p-4 sm:p-5" tone={j.status === "ditolak" ? "bg-cherry/30" : "bg-white"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full bg-paper px-2 py-0.5 ${MICRO}`}>
                        {formatTanggal(j.tanggal, true)}
                      </span>
                      <span className={`flex items-center gap-1.5 ${MICRO}`}>
                        <IconClock size={13} /> {j.masuk} – {j.keluar}
                      </span>
                    </div>
                    <h3 className="font-display text-base leading-tight">{j.judul}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-ink/70">
                      {j.kegiatan}
                    </p>
                  </div>
                  <StatusBadge status={j.status} />
                </div>

                <div className="mt-3 border-t-2 pt-3">
                  <VerifySteps status={j.status} />
                </div>

                {j.catatanDudi ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-ink/75">
                    <IconBuilding size={14} className="mt-0.5 shrink-0" />
                    <span>DUDI: “{j.catatanDudi}”</span>
                  </p>
                ) : null}
              </Panel>
            ))}
          </div>
        )}
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
