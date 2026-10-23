"use client";

import { useState } from "react";
import {
  Panel,
  Btn,
  PageHeader,
  SectionTitle,
  Avatar,
  Badge,
  Input,
  Progress,
  LaporanBadge,
  EmptyState,
  LoadingBlock,
} from "@/components/ui";
import {
  IconSearch,
  IconArrow,
  IconUsers,
  IconBook,
  IconCalendar,
  IconX,
} from "@/components/icons";
import { useApi } from "@/lib/api";
import { kalenderHadirDari } from "@/lib/calc";
import { useHariIni, NAMA_BULAN, hariKerja } from "@/lib/tanggal";
import { kehadiranBulanan } from "@/lib/kehadiran";

const MICRO = "text-[11px] font-medium text-ink/65";

const pad = (n) => String(n).padStart(2, "0");

const periodeISO = (tahun, bulan) => `${tahun}-${pad(bulan)}`;

const HARI_HEAD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const SEL_STATES = {
  hadir: "bg-mint",
  alpa: "bg-cherry/50",
  libur: "bg-paper text-ink/65",
  akan: "bg-white text-ink/65",
  kosong: "bg-white text-ink/65",
};

const SEL_LABEL = {
  hadir: "ada jurnal",
  alpa: "tanpa jurnal",
  libur: "hari libur",
  akan: "belum berjalan",
  kosong: "belum berjalan",
};

function Gagal({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/40 p-5"
    >
      <p className={MICRO}>Gagal memuat data</p>
      <p className="mt-1 text-sm font-bold">{error?.message ?? "Permintaan gagal."}</p>
      <Btn tone="white" size="sm" className="mt-3" onClick={onRetry}>
        Coba lagi
      </Btn>
    </div>
  );
}

function KalenderSiswa({ siswaId, tahun, bulan, hariIni, onClose }) {
  const query = useApi(
    siswaId && tahun && bulan
      ? `/api/jurnal?siswaId=${siswaId}&bulan=${periodeISO(tahun, bulan)}`
      : null
  );
  const sel = kalenderHadirDari(
    query.data?.jurnal ?? [],
    tahun,
    bulan - 1,
    hariIni
  );
  const offset = ((sel[0]?.hari ?? 0) + 6) % 7;
  const label = `${NAMA_BULAN[bulan - 1]} ${tahun}`;

  return (
    <div className="mt-4 rounded-brutal bg-paper p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className={MICRO}>Daftar hadir {label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup daftar hadir"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm active:opacity-90"
        >
          <IconX size={14} />
        </button>
      </div>

      {query.loading ? (
        <LoadingBlock label={`Memuat daftar hadir ${label}…`} />
      ) : query.error ? (
        <Gagal error={query.error} onRetry={query.reload} />
      ) : (
        <>
          <div className="grid max-w-[320px] grid-cols-7 gap-1.5">
            {HARI_HEAD.map((h) => (
              <span
                key={h}
                className="text-center text-[10px] font-bold text-ink/65"
              >
                {h}
              </span>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`kosong-${i}`} />
            ))}
            {sel.map((c) => (
              <span
                key={c.iso}
                title={`${c.d} ${label} · ${SEL_LABEL[c.state] ?? c.state}`}
                className={`grid aspect-square place-items-center rounded-md text-[11px] font-bold ${SEL_STATES[c.state]}`}
              >
                {c.d}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-ink/65">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-mint" />
              Ada jurnal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-cherry/50" />
              Tanpa jurnal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-paper" />
              Libur
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function SiswaBimbinganPage() {
  const [q, setQ] = useState("");
  const [hadirId, setHadirId] = useState(null);

  const hariIni = useHariIni();
  const tahun = hariIni ? Number(hariIni.slice(0, 4)) : 0;
  const bulan = hariIni ? Number(hariIni.slice(5, 7)) : 0;

  const dudiQuery = useApi("/api/dudi?mine=1");
  const siswaQuery = useApi(
    hariIni ? `/api/siswa?stats=1&tahun=${tahun}&bulan=${bulan}` : null
  );
  const laporanQuery = useApi("/api/laporan");

  const dudi = dudiQuery.data?.dudi ?? null;
  const bimbingan = siswaQuery.data?.siswa ?? [];
  const stats = siswaQuery.data?.stats ?? {};
  const laporan = laporanQuery.data?.laporan ?? [];

  const kata = q.trim().toLowerCase();
  const hasil = kata
    ? bimbingan.filter(
        (s) => s.nama.toLowerCase().includes(kata) || s.nis.includes(kata)
      )
    : bimbingan;

  const kerjaBerjalan =
    hariIni && tahun && bulan
      ? hariKerja(`${periodeISO(tahun, bulan)}-01`, hariIni)
      : 0;
  const labelBulan = bulan ? `${NAMA_BULAN[bulan - 1]} ${tahun}` : "";

  function cobaLagi() {
    dudiQuery.reload();
    siswaQuery.reload();
    laporanQuery.reload();
  }

  const memuat =
    !hariIni ||
    (dudiQuery.loading && !dudiQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data) ||
    (laporanQuery.loading && !laporanQuery.data);
  const galat = dudiQuery.error || siswaQuery.error || laporanQuery.error;

  if (memuat) return <LoadingBlock label="Memuat daftar praktikan…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;
  if (!dudi) {
    return (
      <EmptyState
        title="Tempat PKL belum diatur"
        desc="Akun ini belum terhubung ke mitra. Hubungi admin."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Siswa Bimbingan"
        desc={`${bimbingan.length} praktikan di ${dudi.nama}.`}
        action={
          <Btn href="/pembimbing-dudi/verifikasi" tone="green">
            <IconBook size={16} /> Verifikasi Jurnal
          </Btn>
        }
      />

      {}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink/65">
            <IconSearch size={16} />
          </span>
          <Input
            className="pl-9"
            placeholder="Cari nama atau NIS siswa…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari nama atau NIS siswa"
          />
        </div>
        <Badge tone="white">
          <IconUsers size={12} /> {hasil.length} siswa
        </Badge>
        <Badge tone="green">DUDI: {dudi.nama}</Badge>
      </div>

      <SectionTitle
        right={
          <span className="text-xs font-bold text-ink/65">
            {hasil.length} dari {bimbingan.length} praktikan
          </span>
        }
      >
        Daftar Praktikan
      </SectionTitle>

      <div className="grid gap-4">
        {hasil.length === 0 ? (
          <EmptyState
            title="Siswa tidak ditemukan"
            desc={`Tidak ada praktikan yang cocok dengan “${q}”.`}
            action={
              <Btn tone="white" onClick={() => setQ("")}>
                Bersihkan pencarian
              </Btn>
            }
          />
        ) : (
          hasil.map((s) => {
            const st = stats[s.id] ?? {
              jml: 0,
              hadir: 0,
              diterima: 0,
              mulai: null,
              bulan: 0,
            };
            const hadir = st.bulan;
            const kehadiran = kehadiranBulanan(st, { tahun, bulan, hariIni }).pct;
            const diterima = st.diterima;
            const progress = st.jml
              ? Math.round((diterima / st.jml) * 100)
              : 0;
            const laporanSiswa = [...laporan.filter((l) => l.siswaId === s.id)].sort(
              (a, b) => b.diperbarui.localeCompare(a.diperbarui)
            )[0];
            const terbuka = hadirId === s.id;

            return (
              <Panel key={s.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={s.nama} size="lg" src={s.akun?.fotoUrl} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg leading-tight">{s.nama}</h3>
                      <Badge tone={s.status === "aktif" ? "green" : "orange"}>
                        {s.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs font-bold tracking-wide text-ink/70">
                      NIS {s.nis} · {s.kelas}
                    </p>
                    <p className="text-xs font-semibold text-ink/65">
                      {dudi.nama} · {dudi.bidang} ·{" "}
                      {dudi.alamat}
                    </p>

                    {}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="yellow">
                        <IconBook size={12} /> {hadir} jurnal bulan ini
                      </Badge>
                      <Badge tone="blue">
                        <IconCalendar size={12} /> {kehadiran}% kehadiran
                      </Badge>
                      {laporanSiswa ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-ink/65">
                            Laporan:
                          </span>
                          <LaporanBadge status={laporanSiswa.status} />
                        </span>
                      ) : (
                        <Badge tone="gray">Belum ada laporan</Badge>
                      )}
                    </div>

                    {}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-end justify-between gap-3 text-xs font-bold tracking-wide">
                        <span>
                          Jurnal terverifikasi · {diterima} dari {st.jml}
                        </span>
                        <span className="font-display text-base">{progress}%</span>
                      </div>
                      <Progress value={progress} tone="bg-mint" />
                    </div>

                    {}
                    {terbuka && hariIni && tahun && bulan ? (
                      <KalenderSiswa
                        siswaId={s.id}
                        tahun={tahun}
                        bulan={bulan}
                        hariIni={hariIni}
                        onClose={() => setHadirId(null)}
                      />
                    ) : null}
                  </div>

                  {}
                  <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:flex-col">
                    <Btn
                      href="/pembimbing-dudi/verifikasi"
                      tone="yellow"
                      className="w-full flex-1"
                    >
                      Lihat Jurnal <IconArrow size={14} />
                    </Btn>
                    <Btn
                      tone="white"
                      className="flex-1"
                      aria-expanded={terbuka}
                      onClick={() => setHadirId(terbuka ? null : s.id)}
                    >
                      <IconCalendar size={14} />{" "}
                      {terbuka ? "Tutup Hadir" : "Buka Daftar Hadir"}
                    </Btn>
                  </div>
                </div>
              </Panel>
            );
          })
        )}
      </div>

      <p className="mt-4 text-[11px] font-bold tracking-wide text-ink/65">
        Kehadiran dihitung dari jurnal harian · hari kerja berjalan{" "}
        {kerjaBerjalan} hari ({labelBulan || "bulan ini"})
      </p>
    </div>
  );
}
