"use client";

import Link from "next/link";
import {
  Panel,
  Btn,
  Stat,
  PageHeader,
  SectionTitle,
  Avatar,
  StatusBadge,
  LaporanBadge,
  Progress,
  EmptyState,
  LoadingBlock,
} from "@/components/ui";
import {
  IconCheck,
  IconClock,
  IconFile,
  IconShield,
  IconUsers,
} from "@/components/icons";
import { useApi } from "@/lib/api";
import { formatTanggal, cariSiswa } from "@/lib/calc";
import { NAMA_BULAN } from "@/lib/tanggal";

const STATUS_ROWS = [
  { key: "menunggu_dudi", label: "Menunggu DUDI", tone: "bg-sun" },
  { key: "menunggu_sekolah", label: "Menunggu Sekolah", tone: "bg-marine" },
  { key: "diterima", label: "Diterima", tone: "bg-mint" },
  { key: "ditolak", label: "Ditolak", tone: "bg-cherry" },
];

function Gagal({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/40 p-5"
    >
      <p className="text-[11px] font-bold tracking-wide text-ink/70">
        Gagal memuat data
      </p>
      <p className="mt-1 text-sm font-bold">{error?.message ?? "Permintaan gagal."}</p>
      <Btn tone="white" size="sm" className="mt-3" onClick={onRetry}>
        Coba lagi
      </Btn>
    </div>
  );
}

export default function PembimbingSekolahDashboard() {
  const ringkasQuery = useApi("/api/ringkas");
  const antreQuery = useApi("/api/jurnal?status=menunggu_sekolah&limit=5");
  const laporanBaruQuery = useApi("/api/laporan?status=terkirim&limit=500");
  const siswaQuery = useApi("/api/siswa");
  const meQuery = useApi("/api/auth/me");

  const ringkas = ringkasQuery.data;
  const kartuAntre = antreQuery.data?.jurnal ?? [];
  const kartuLaporan = (laporanBaruQuery.data?.laporan ?? []).filter(
    (l) => l.status === "terkirim"
  );
  const siswaList = siswaQuery.data?.siswa ?? [];
  const me = meQuery.data?.user ?? null;

  const totalMenungguAkhir = ringkas?.jurnal.menunggu_sekolah ?? 0;
  const totalLaporanTerkirim = ringkas?.laporan.terkirim ?? 0;
  const totalDiterimaBulan = ringkas?.jurnal.bulan.diterima ?? 0;
  const totalSiswa = ringkas?.siswa.total ?? 0;

  const periode = ringkas?.jurnal.periode ?? null;
  const labelPeriode = periode
    ? `${NAMA_BULAN[Number(periode.slice(5, 7)) - 1]} ${periode.slice(0, 4)}`
    : null;

  const rekap = STATUS_ROWS.map((r) => ({
    ...r,
    count: ringkas?.jurnal.bulan[r.key] ?? 0,
  }));
  const maxRekap = Math.max(...rekap.map((r) => r.count), 1);
  const totalJurnalBulan = ringkas?.jurnal.bulan.total ?? 0;

  function cobaLagi() {
    ringkasQuery.reload();
    antreQuery.reload();
    laporanBaruQuery.reload();
    siswaQuery.reload();
    meQuery.reload();
  }

  const memuat =
    (ringkasQuery.loading && !ringkasQuery.data) ||
    (antreQuery.loading && !antreQuery.data) ||
    (laporanBaruQuery.loading && !laporanBaruQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data) ||
    (meQuery.loading && !meQuery.data);
  const galat =
    ringkasQuery.error ||
    antreQuery.error ||
    laporanBaruQuery.error ||
    siswaQuery.error ||
    meQuery.error;

  if (memuat) return <LoadingBlock label="Memuat dasbor pembimbing…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;

  const STATS = [
    {
      label: "Menunggu Verifikasi Akhir",
      value: totalMenungguAkhir,
      sub: "Tahap 2 dari 2",
      tone: "bg-sun",
      icon: <IconClock size={18} />,
    },
    {
      label: "Laporan Menunggu Review",
      value: totalLaporanTerkirim,
      sub: "Baru dikirim siswa",
      tone: "bg-candy",
      icon: <IconFile size={18} />,
    },
    {
      label: "Siswa Diawasi",
      value: totalSiswa,
      sub: "Semua mitra DUDI",
      tone: "bg-marine",
      icon: <IconUsers size={18} />,
    },
    {
      label: "Jurnal Diterima Bulan Ini",
      value: totalDiterimaBulan,
      sub: labelPeriode ?? "Belum ada data bulan ini",
      tone: "bg-mint",
      icon: <IconCheck size={18} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Halo, ${me?.nama ?? "Pembimbing Sekolah"}!`}
        desc={`${totalMenungguAkhir} jurnal menunggu pengesahan, ${totalLaporanTerkirim} laporan menunggu review.`}
        action={
          <Btn href="/pembimbing-sekolah/verifikasi" tone="purple">
            <IconCheck size={16} /> Mulai Verifikasi
          </Btn>
        }
      />

      {}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-grape px-4 py-3">
            <h2 className="font-display flex items-center gap-2 text-lg">
              <IconShield size={18} /> Verifikasi Akhir
            </h2>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold">
              {totalMenungguAkhir} antre
            </span>
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            {kartuAntre.length === 0 ? (
              <EmptyState
                title="Antrean kosong"
                desc="Tidak ada jurnal yang menunggu verifikasi akhir."
              />
            ) : (
              kartuAntre.map((j) => (
                <Link
                  key={j.id}
                  href="/pembimbing-sekolah/verifikasi"
                  className="block"
                >
                  <Panel className="p-3 transition-all ">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold">
                            {formatTanggal(j.tanggal, true)}
                          </span>
                          <span className="text-[11px] font-bold text-ink/65">
                            {j.masuk} – {j.keluar}
                          </span>
                        </div>
                        <h3 className="font-display text-base leading-tight">
                          {j.judul}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Avatar name={j.siswaNama ?? "?"} size="sm" src={j.fotoUrl} />
                          <span className="text-xs font-semibold text-ink/70">
                            {j.siswaNama} · {j.siswaKelas}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>
                  </Panel>
                </Link>
              ))
            )}

            {totalMenungguAkhir > kartuAntre.length ? (
              <Btn
                href="/pembimbing-sekolah/verifikasi"
                tone="white"
                size="sm"
                className="w-full"
              >
                Lihat semua {totalMenungguAkhir} antrean →
              </Btn>
            ) : null}

            <Link
              href="/pembimbing-sekolah/verifikasi"
              className="text-xs font-bold underline decoration-[3px] underline-offset-4"
            >
              Buka ruang verifikasi →
            </Link>
          </div>
        </Panel>

        {}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-candy px-4 py-3">
            <h2 className="font-display flex items-center gap-2 text-lg">
              <IconFile size={18} /> Laporan Masuk
            </h2>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold">
              {totalLaporanTerkirim} baru
            </span>
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            {kartuLaporan.length === 0 ? (
              <EmptyState
                title="Belum ada laporan baru"
                desc="Laporan dari siswa akan muncul di sini."
              />
            ) : (
              kartuLaporan.map((l) => {
                const s = cariSiswa(siswaList, l.siswaId);
                const nama = s?.nama ?? l.siswaNama ?? "-";
                const kelas = s?.kelas ?? "-";
                return (
                  <Link
                    key={l.id}
                    href="/pembimbing-sekolah/laporan"
                    className="block"
                  >
                    <Panel className="p-3 transition-all ">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-base leading-tight">
                            {l.judul}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Avatar name={nama} size="sm" />
                            <span className="text-xs font-semibold text-ink/70">
                              {nama} · {kelas} · v{l.versi}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-bold text-ink/65">
                            {l.ukuran} · {l.halaman} halaman ·{" "}
                            {formatTanggal(l.diperbarui, true)}
                          </p>
                        </div>
                        <LaporanBadge status={l.status} />
                      </div>
                    </Panel>
                  </Link>
                );
              })
            )}

            <Link
              href="/pembimbing-sekolah/laporan"
              className="text-xs font-bold underline decoration-[3px] underline-offset-4"
            >
              Review semua laporan →
            </Link>
          </div>
        </Panel>
      </div>

      {}
      <div className="mt-8">
        <SectionTitle
          right={
            <span className="text-xs font-bold text-ink/65">
              {labelPeriode
                ? `Total ${totalJurnalBulan} jurnal · ${labelPeriode}`
                : "Belum ada data jurnal"}
            </span>
          }
        >
          Rekap Jurnal per Status
        </SectionTitle>

        <Panel className="p-4 sm:p-5">
          <div className="grid gap-4">
            {rekap.map((r) => (
              <div key={r.key}>
                <div className="mb-1.5 flex items-end justify-between gap-3 text-xs font-bold tracking-wide">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${r.tone}`}
                    />
                    {r.label}
                  </span>
                  <span className="font-display text-base">{r.count}</span>
                </div>
                <Progress value={(r.count / maxRekap) * 100} tone={r.tone} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
