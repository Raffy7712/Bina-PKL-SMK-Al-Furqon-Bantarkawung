"use client";

import Link from "next/link";
import {
  Panel,
  Btn,
  Stat,
  PageHeader,
  SectionTitle,
  Avatar,
  Badge,
  StatusBadge,
  Progress,
  EmptyState,
  LoadingBlock,
} from "@/components/ui";
import {
  IconArrow,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFile,
  IconUsers,
} from "@/components/icons";
import { useApi } from "@/lib/api";
import { formatTanggal } from "@/lib/calc";
import { useHariIni, NAMA_BULAN } from "@/lib/tanggal";
import { kehadiranBulanan } from "@/lib/kehadiran";

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

const pad = (n) => String(n).padStart(2, "0");

export default function PembimbingDudiDashboard() {
  const hariIni = useHariIni();
  const tahun = hariIni ? Number(hariIni.slice(0, 4)) : 0;
  const bulan = hariIni ? Number(hariIni.slice(5, 7)) : 0;

  const dudiQuery = useApi("/api/dudi?mine=1");
  const siswaQuery = useApi(
    hariIni ? `/api/siswa?stats=1&tahun=${tahun}&bulan=${bulan}` : null
  );
  const ringkasQuery = useApi("/api/ringkas");
  const antreQuery = useApi("/api/jurnal?status=menunggu_dudi&limit=5");
  const meQuery = useApi("/api/auth/me");

  const dudi = dudiQuery.data?.dudi ?? null;
  const bimbingan = siswaQuery.data?.siswa ?? [];
  const ringkas = ringkasQuery.data ?? null;
  const stats = siswaQuery.data?.stats ?? {};
  const me = meQuery.data?.user ?? null;
  const menunggu = antreQuery.data?.jurnal ?? [];

  const jmlMenunggu = ringkas?.jurnal.menunggu_dudi ?? 0;
  const jmlDiverifikasi =
    (ringkas?.jurnal.bulan.menunggu_sekolah ?? 0) +
    (ringkas?.jurnal.bulan.diterima ?? 0);

  const periode = ringkas?.jurnal.periode ?? null;
  const labelPeriode = periode
    ? `${NAMA_BULAN[Number(periode.slice(5, 7)) - 1]} ${periode.slice(0, 4)}`
    : null;
  const labelBulan = bulan ? NAMA_BULAN[bulan - 1] : "";

  const kehadiran = ringkas?.kehadiran ?? null;
  const adaKehadiran =
    !!kehadiran && kehadiran.hariKerja > 0 && kehadiran.siswa > 0;

  const hariHadir = (siswaId) => stats[siswaId]?.bulan ?? 0;

  function cobaLagi() {
    dudiQuery.reload();
    siswaQuery.reload();
    ringkasQuery.reload();
    antreQuery.reload();
    meQuery.reload();
  }

  const memuat =
    !hariIni ||
    (dudiQuery.loading && !dudiQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data) ||
    (ringkasQuery.loading && !ringkasQuery.data) ||
    (antreQuery.loading && !antreQuery.data) ||
    (meQuery.loading && !meQuery.data);
  const galat =
    dudiQuery.error ||
    siswaQuery.error ||
    ringkasQuery.error ||
    antreQuery.error ||
    meQuery.error;

  if (memuat) return <LoadingBlock label="Memuat dasbor pembimbing…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;
  if (!dudi) {
    return (
      <EmptyState
        title="Tempat PKL belum diatur"
        desc="Akun ini belum terhubung ke mitra. Hubungi admin."
      />
    );
  }

  const STATS = [
    {
      label: "Jurnal Menunggu Verifikasi",
      value: jmlMenunggu,
      sub: "Perlu keputusanmu",
      tone: "bg-sun",
      icon: <IconClock size={18} />,
    },
    {
      label: "Siswa Bimbingan",
      value: dudi.jmlSiswa,
      sub: dudi.nama,
      tone: "bg-marine",
      icon: <IconUsers size={18} />,
    },
    {
      label: "Jurnal Diverifikasi Bulan Ini",
      value: jmlDiverifikasi,
      sub: labelPeriode
        ? `Disetujui DUDI · ${labelPeriode}`
        : "Belum ada data bulan ini",
      tone: "bg-mint",
      icon: <IconCheck size={18} />,
    },
    {
      label: "Kehadiran Rata-rata",
      value: adaKehadiran ? `${kehadiran.persen}%` : "-",
      sub: adaKehadiran
        ? `${kehadiran.hadir} hari hadir · ${kehadiran.siswa} praktikan`
        : "Belum ada data kehadiran",
      tone: "bg-candy",
      icon: <IconBook size={18} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Halo, ${me?.nama ?? "Pembimbing DUDI"}!`}
        desc={`Praktikan ${dudi.nama}, dibimbing ${dudi.pembimbing}.`}
        action={
          <Btn href="/pembimbing-dudi/verifikasi" tone="green">
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

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {}
        <div>
          <SectionTitle
            right={
              <Link
                href="/pembimbing-dudi/verifikasi"
                className="text-xs font-bold underline decoration-[3px] underline-offset-4"
              >
                Semua jurnal →
              </Link>
            }
          >
            Menunggu Verifikasi
          </SectionTitle>

          {menunggu.length === 0 ? (
            <EmptyState
              title="Tidak ada antrean"
              desc="Semua jurnal praktikan sudah kamu proses."
            />
          ) : (
            <div className="grid gap-3">
              {menunggu.map((j) => (
                  <Panel key={j.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold">
                            {formatTanggal(j.tanggal, true)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink/65">
                            <IconClock size={13} /> {j.masuk} – {j.keluar}
                          </span>
                        </div>
                        <h3 className="font-display text-base leading-tight">
                          {j.judul}
                        </h3>
                        <p className="mt-1 text-sm font-semibold">
                          {j.siswaNama} · {j.siswaKelas}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-ink/70">
                          {j.kegiatan}
                        </p>
                      </div>
                      <Badge tone={j.lampiran ? "white" : "red"}>
                        <IconFile size={12} /> {j.lampiran || "Tanpa lampiran"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 pt-3">
                      <StatusBadge status={j.status} />
                      <Btn href="/pembimbing-dudi/verifikasi" tone="ink" size="sm">
                        Review <IconArrow size={14} />
                      </Btn>
                    </div>
                  </Panel>
                ))}
            </div>
          )}
        </div>

        {}
        <div className="grid gap-5">
          {}
          <Panel tone="bg-marine" className="p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-white">
                  Siswa bimbingan
                </p>
                <h3 className="font-display text-xl leading-tight text-white">
                  {bimbingan.length} praktikan
                </h3>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm">
                <IconUsers size={18} />
              </span>
            </div>

            <div className="grid gap-2">
              {bimbingan.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-brutal bg-white p-2.5 shadow-brutal-sm"
                >
                  <Avatar name={s.nama} size="sm" src={s.akun?.fotoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">
                      {s.nama}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-ink/70">
                      {s.kelas} · NIS {s.nis}
                    </p>
                  </div>
                  <Badge tone={s.status === "aktif" ? "green" : "orange"}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-ink/70">
                Mitra: {dudi.nama}
              </span>
              <Btn href="/pembimbing-dudi/siswa" tone="white" size="sm">
                Lihat Detail <IconArrow size={14} />
              </Btn>
            </div>
          </Panel>

          {}
          <Panel className="p-4 sm:p-5">
            <SectionTitle
              right={
                <span className="text-xs font-bold text-ink/65">
                  {labelBulan || "-"}
                </span>
              }
            >
              Daftar Hadir dari Jurnal
            </SectionTitle>

            <div className="grid gap-3">
              {bimbingan.map((s) => {
                const n = hariHadir(s.id);
                const persen = kehadiranBulanan(stats[s.id], {
                  tahun,
                  bulan,
                  hariIni,
                }).pct;
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold tracking-wide">
                      <span className="truncate">{s.nama}</span>
                      <span className="font-display text-sm">
                        {n} hari · {persen}%
                      </span>
                    </div>
                    <Progress value={persen} tone="bg-mint" />
                  </div>
                );
              })}
            </div>

            <p className="mt-3 flex items-start gap-2 rounded-brutal bg-paper p-3 text-xs font-semibold">
              <span className="mt-px shrink-0">
                <IconCalendar size={14} />
              </span>
              <span>
                Dihitung otomatis dari jurnal {labelBulan || "bulan ini"} yang
                tidak ditolak, dibanding hari kerja berjalan sampai hari ini.
              </span>
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
