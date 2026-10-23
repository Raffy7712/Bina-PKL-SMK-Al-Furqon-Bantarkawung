"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Stat,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TableWrap,
  Th,
  Td,
  trCls,
  EmptyState,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import {
  IconCalendar,
  IconCheck,
  IconX,
  IconClock,
  IconDownload,
} from "@/components/icons";
import { useApi } from "@/lib/api";
import { formatTanggal, kalenderHadirDari, rekapHadirDari } from "@/lib/calc";
import {
  useHariIni,
  isoHariIni,
  formatTanggalPanjang,
  NAMA_BULAN,
  NAMA_HARI,
} from "@/lib/tanggal";

const MICRO = "text-[11px] font-medium text-ink/65";

const KOLOM = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const LEGEND = [
  { label: "Hadir (ada jurnal)", cls: "bg-mint" },
  { label: "Tidak ada jurnal", cls: "bg-cherry" },
  { label: "Libur", cls: "bg-paper border" },
  { label: "Akan datang", cls: "bg-white" },
];

const TONE_HARI = {
  hadir: "bg-mint",
  alpa: "bg-cherry",
  libur: "bg-paper border text-ink/65",
  akan: "bg-white text-ink/65",
  kosong: "bg-white",
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

function totalJamPraktik(list) {
  let menit = 0;
  for (const j of list) {
    const m = String(j.masuk ?? "");
    const k = String(j.keluar ?? "");
    if (!m || !k) continue;
    const [mh, mm] = m.split(":").map(Number);
    const [kh, km] = k.split(":").map(Number);
    if (![mh, mm, kh, km].every(Number.isFinite)) continue;
    menit += kh * 60 + km - (mh * 60 + mm);
  }
  return menit;
}

function isoTanggalBulan(list, tahun, bulan) {
  return list.filter((j) => {
    const [y, m] = j.tanggal.split("-").map(Number);
    return y === tahun && m - 1 === bulan;
  });
}

export default function AbsensiPage() {
  const hariIni = useHariIni();
  const jurnalQuery = useApi("/api/jurnal");
  const siswaQuery = useApi("/api/siswa");
  const dudiQuery = useApi("/api/dudi?mine=1");
  const [toast, setToast] = useState("");
  const [tanggalCetak, setTanggalCetak] = useState("");
  const toastTimer = useRef(null);

  const jurnal = jurnalQuery.data?.jurnal ?? [];
  const siswa = (siswaQuery.data?.siswa ?? []).find((s) => s.saya) ?? null;
  const dudi = dudiQuery.data?.dudi ?? null;
  const siswaTampil = siswa ?? { nama: "-", nis: "-", kelas: "-" };

  const [tahunSekarang, bulanAngka] = hariIni ? hariIni.split("-").map(Number) : [0, 0];
  const bulanSekarang = hariIni ? bulanAngka - 1 : null;
  const siap = bulanSekarang != null;
  const labelBulan = siap ? `${NAMA_BULAN[bulanSekarang]} ${tahunSekarang}` : "";

  const cells = siap
    ? kalenderHadirDari(jurnal, tahunSekarang, bulanSekarang, hariIni)
    : [];
  const jurnalBulanIni = siap
    ? rekapHadirDari(jurnal, null, tahunSekarang, bulanSekarang)
    : 0;
  const jurnalBulan = siap ? isoTanggalBulan(jurnal, tahunSekarang, bulanSekarang) : [];

  const hadir = cells.filter((c) => c.state === "hadir").length;
  const alpa = cells.filter((c) => c.state === "alpa").length;
  const kerja = hadir + alpa;
  const persen = kerja ? Math.round((hadir / kerja) * 100) : 0;
  const menit = totalJamPraktik(jurnalBulan);
  const jamText = `${Math.floor(menit / 60)}j ${menit % 60}m`;

  const offset = cells.length ? (cells[0].hari + 6) % 7 : 0;

  const gagal = jurnalQuery.error || siswaQuery.error || dudiQuery.error;

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function cobaLagi() {
    jurnalQuery.reload();
    siswaQuery.reload();
    dudiQuery.reload();
  }

  function cetakDaftarHadir() {
    setTanggalCetak(formatTanggalPanjang(isoHariIni()));
    setTimeout(() => window.print(), 100);
    showToast("Daftar hadir siap dicetak. Pilih printer atau simpan PDF");
  }

  return (
    <div>
      <PageHeader
        title="Daftar Hadir"
        desc={
          siap
            ? `Kehadiran ${labelBulan}, dihitung dari jurnalmu.`
            : "Kehadiran yang dihitung dari jurnal harianmu."
        }
        action={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Badge tone="green">{`${persen}% Hadir`}</Badge>
            <Btn tone="ink" onClick={cetakDaftarHadir}>
              <IconDownload size={16} /> Cetak Daftar Hadir
            </Btn>
          </div>
        }
      />

      {gagal ? (
        <div className="mb-6">
          <GagalMemuat pesan={gagal.message} onCoba={cobaLagi} />
        </div>
      ) : null}

      {}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-brutal bg-white px-4 py-3 shadow-brutal print:mb-4">
        <div>
          <p className={MICRO}>Daftar Hadir PKL</p>
          <p className="font-display text-base sm:text-lg">
            {labelBulan || "-"}
          </p>
        </div>
        <div>
          <p className={MICRO}>Siswa</p>
          <p className="text-sm font-bold">
            {siswaTampil.nama} · NIS {siswaTampil.nis} · {siswaTampil.kelas}
          </p>
        </div>
        <div>
          <p className={MICRO}>Tempat PKL</p>
          <p className="text-sm font-bold">{dudi?.nama ?? "-"}</p>
        </div>
        <div>
          <p className={MICRO}>Tanggal Cetak</p>
          <p className="text-sm font-bold">
            {tanggalCetak || "-"}
          </p>
        </div>
      </div>

      {}
      <Panel tone="bg-marine" className="flex items-start gap-3 p-4 sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm">
          <IconCalendar size={18} />
        </span>
        <div>
          <p className="font-display text-base leading-tight text-white">
            Kehadiran mengikuti jurnal harianmu, bukan input manual.
          </p>
          <p className="mt-1 text-xs font-semibold text-white">
            Sehari dihitung <b>hadir</b> bila jurnalnya tidak ditolak.
          </p>
        </div>
      </Panel>

      {jurnalQuery.loading || !siap ? (
        <div className="mt-6">
          <LoadingBlock label="Memuat rekap kehadiran…" />
        </div>
      ) : jurnalQuery.error ? null : (
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr] print:block">
        {}
        <Panel className="p-4 sm:p-5">
          <SectionTitle
            right={
              <span className={MICRO}>
                {jurnalBulanIni} hari tercatat
              </span>
            }
          >
            {labelBulan}
          </SectionTitle>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {KOLOM.map((h) => (
              <div key={h} className={`text-center ${MICRO}`}>
                {h}
              </div>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`pad-${i}`} aria-hidden />
            ))}
            {cells.map((c) => (
              <div
                key={c.iso}
                title={`${formatTanggal(c.iso, true)}, ${
                  c.state === "hadir"
                    ? "hadir"
                    : c.state === "alpa"
                      ? "tidak ada jurnal"
                      : c.state === "libur"
                        ? "libur"
                        : "akan datang"
                }`}
                className={`grid aspect-square place-items-center rounded-brutal text-xs font-bold shadow-brutal-sm ${TONE_HARI[c.state]}`}
              >
                {c.d}
              </div>
            ))}
          </div>

          {}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t-2 pt-3">
            {LEGEND.map((l) => (
              <span key={l.label} className={`flex items-center gap-1.5 ${MICRO}`}>
                <span
                  className={`h-4 w-4 rounded-[4px] ${l.cls}`}
                  aria-hidden
                />
                {l.label}
              </span>
            ))}
          </div>
        </Panel>

        {}
        <div className="grid content-start gap-4 sm:grid-cols-2 print:mt-6">
          <Stat
            label="Hari Hadir"
            value={hadir}
            sub="Jurnal berstatus valid"
            tone="bg-mint"
            icon={<IconCheck size={18} />}
          />
          <Stat
            label="Tidak Ada Jurnal"
            value={alpa}
            sub="Hari kerja terlewat"
            tone="bg-cherry"
            icon={<IconX size={18} />}
          />
          <Stat
            label="Persentase"
            value={`${persen}%`}
            sub={`${hadir} dari ${kerja} hari kerja lewat`}
            tone="bg-sun"
            icon={<IconCalendar size={18} />}
          />
          <Stat
            label="Jam Praktik Total"
            value={jamText}
            sub={`${jurnalBulanIni} hari · ${jurnalBulan.length} entri jurnal ${labelBulan}`}
            tone="bg-marine"
            icon={<IconClock size={18} />}
          />
        </div>
      </div>
      )}

      {}
      <div className="mt-8">
        <SectionTitle
          right={
            <span className={MICRO}>
              {Math.min(10, jurnal.length)} entri terakhir
            </span>
          }
        >
          Rincian Jurnal Terakhir
        </SectionTitle>

        {jurnalQuery.loading ? (
          <LoadingBlock label="Memuat rincian jurnal…" />
        ) : jurnalQuery.error ? null : jurnal.length === 0 ? (
          <EmptyState
            title="Belum ada jurnal sama sekali"
            desc="Tulis jurnal, kehadiranmu terisi sendiri."
            action={
              <Btn tone="ink" href="/siswa/jurnal">
                Tulis Jurnal
              </Btn>
            }
          />
        ) : (
          <TableWrap className="print:shadow-none">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr>
                  {["Tanggal", "Hari", "Jam Masuk", "Jam Keluar", "Status"].map(
                    (h) => (
                      <Th key={h}>{h}</Th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {jurnal.slice(0, 10).map((j) => {
                  const [y, m, d] = j.tanggal.split("-").map(Number);
                  const hari = NAMA_HARI[new Date(y, m - 1, d).getDay()];
                  return (
                    <tr key={j.id} className={trCls}>
                      <Td className="text-sm font-bold">
                        {d} {NAMA_BULAN[m - 1]} {y}
                      </Td>
                      <Td className="text-sm font-semibold text-ink/70">
                        {hari}
                      </Td>
                      <Td className="text-sm font-semibold">{j.masuk}</Td>
                      <Td className="text-sm font-semibold">{j.keluar}</Td>
                      <Td>
                        <StatusBadge status={j.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
