"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Panel,
  Btn,
  Badge,
  Stat,
  PageHeader,
  SectionTitle,
  Avatar,
  TableWrap,
  Th,
  Td,
  trCls,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import {
  IconUsers,
  IconCalendar,
  IconCheck,
  IconBell,
  IconDownload,
  IconFile,
} from "@/components/icons";
import { useApi } from "@/lib/api";
import {
  NAMA_BULAN,
  NAMA_BULAN_SINGKAT,
  NAMA_HARI,
  formatTanggalPendek,
  geserBulan,
  hariKerja,
  jumlahHari,
  useHariIni,
} from "@/lib/tanggal";
import { kehadiranBulanan } from "@/lib/kehadiran";

const pad = (n) => String(n).padStart(2, "0");

function rincianPeriode(periode, hariIni) {
  const { tahun, bulan } = periode;
  const awalISO = `${tahun}-${pad(bulan)}-01`;
  const bulanBerjalan =
    !!hariIni && hariIni.startsWith(`${tahun}-${pad(bulan)}`);
  const akhirISO = bulanBerjalan
    ? hariIni
    : `${tahun}-${pad(bulan)}-${jumlahHari(tahun, bulan)}`;
  const jumlahKolom = bulanBerjalan
    ? Number(hariIni.slice(8, 10))
    : jumlahHari(tahun, bulan);
  const tanggal = Array.from({ length: jumlahKolom }, (_, i) => {
    const n = i + 1;
    const date = new Date(tahun, bulan - 1, n);
    return {
      n,
      iso: `${tahun}-${pad(bulan)}-${pad(n)}`,
      hari: NAMA_HARI[date.getDay()][0],
      weekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
  return { tahun, bulan, awalISO, akhirISO, bulanBerjalan, tanggal };
}

function cellTone(setHadir, siswaId, day, akhirISO) {
  if (setHadir.has(`${siswaId}|${day.iso}`)) return "bg-mint";
  if (day.iso > akhirISO) return "bg-white";
  if (day.weekend) return "bg-paper border";
  return "bg-cherry";
}

function statusKehadiran(pct) {
  if (pct >= 90) return { label: "Sangat Baik", tone: "green" };
  if (pct >= 75) return { label: "Baik", tone: "yellow" };
  return { label: "Perlu Evaluasi", tone: "red" };
}

function escCSV(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Swatch({ cls, label }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-ink/70">
      <span className={`h-5 w-5 rounded-[4px] ${cls}`} />
      {label}
    </span>
  );
}

export default function AdminAbsensiPage() {
  const hariIni = useHariIni();
  const [periode, setPeriode] = useState(null);

  const bulanIni = hariIni
    ? { tahun: Number(hariIni.slice(0, 4)), bulan: Number(hariIni.slice(5, 7)) }
    : null;
  const tampil = periode ?? bulanIni;
  const rincian = tampil ? rincianPeriode(tampil, hariIni) : null;

  const siswaQuery = useApi(
    rincian
      ? `/api/siswa?stats=1&tahun=${rincian.tahun}&bulan=${rincian.bulan}`
      : null
  );
  const dudiQuery = useApi("/api/dudi");
  const absensiQuery = useApi(
    rincian
      ? `/api/absensi?tahun=${rincian.tahun}&bulan=${rincian.bulan}&stats=1`
      : null
  );

  const siswa = siswaQuery.data?.siswa ?? [];
  const dudiList = dudiQuery.data?.dudi ?? [];

  const [toast, setToast] = useState("");
  const [tglCetak, setTglCetak] = useState("");
  const timer = useRef(null);

  const loading =
    !rincian || siswaQuery.loading || dudiQuery.loading || absensiQuery.loading;
  const error = siswaQuery.error ?? dudiQuery.error ?? absensiQuery.error;
  const adaData = !!siswaQuery.data;

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  function muatUlang() {
    siswaQuery.reload();
    dudiQuery.reload();
    absensiQuery.reload();
  }

  function pindahBulan(delta) {
    if (!rincian) return;
    setPeriode(geserBulan(rincian.tahun, rincian.bulan, delta));
  }

  function cetak() {
    flushSync(() =>
      setTglCetak(
        new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      )
    );
    window.print();
  }

  const setHadir = new Set(absensiQuery.data?.hadir ?? []);
  const statsSiswa = siswaQuery.data?.stats ?? {};

  const recap = rincian
    ? siswa.map((s) => ({
        siswa: s,
        ...kehadiranBulanan(statsSiswa[s.id], {
          tahun: rincian.tahun,
          bulan: rincian.bulan,
          akhirISO: rincian.akhirISO,
        }),
      }))
    : [];
  const recapAktif = recap.filter((r) => r.siswa.status === "aktif");
  const rataRata = recapAktif.length
    ? Math.round(recapAktif.reduce((a, r) => a + r.pct, 0) / recapAktif.length)
    : 0;
  const adaRata = adaData && recapAktif.length > 0;

  const tanpaJurnal = rincian
    ? siswa
        .filter((s) => s.status === "aktif")
        .filter((s) => !setHadir.has(`${s.id}|${rincian.akhirISO}`)).length
    : 0;
  const selAcuan = rincian?.tanggal.find((d) => d.iso === rincian.akhirISO);
  const acuanAkhirPekan = !!selAcuan?.weekend;

  const labelBulan = rincian ? NAMA_BULAN[rincian.bulan - 1] : "";
  const labelBulanSingkat = rincian ? NAMA_BULAN_SINGKAT[rincian.bulan - 1] : "";
  const hariPraktik = rincian ? hariKerja(rincian.awalISO, rincian.akhirISO) : 0;
  const labelRentang = rincian
    ? `${
        rincian.tanggal.length > 1 ? `1 – ${rincian.tanggal.length}` : "1"
      } ${labelBulanSingkat} ${rincian.tahun}`
    : "";
  const adaBelumBerjalan =
    !!rincian && rincian.tanggal.some((d) => d.iso > rincian.akhirISO);

  function unduhCSV() {
    if (!rincian) return;
    const kepala = [
      "NIS",
      "Nama",
      "Kelas",
      "DUDI",
      ...rincian.tanggal.map((d) => `${d.n} ${labelBulanSingkat}`),
      "Total Hadir",
    ];
    const isi = siswa.map((s) => {
      const dudi = s.dudiId ? dudiList.find((d) => d.id === s.dudiId) : null;
      const tanda = rincian.tanggal.map((d) =>
        setHadir.has(`${s.id}|${d.iso}`) ? "H" : "-"
      );
      const total = tanda.filter((t) => t === "H").length;
      return [
        s.nis,
        s.nama,
        s.kelas,
        dudi?.nama ?? s.dudiNama ?? "Belum ada mitra",
        ...tanda,
        total,
      ];
    });
    const csv = [kepala, ...isi].map((r) => r.map(escCSV).join(",")).join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-hadir-${labelBulan.toLowerCase()}-${rincian.tahun}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("CSV diunduh");
  }

  const stats = [
    {
      label: "Total Siswa",
      value: adaData ? siswa.length : "-",
      sub: adaData
        ? `${siswa.filter((s) => s.status === "aktif").length} siswa aktif`
        : "menunggu data",
      tone: "bg-sun",
      icon: <IconUsers size={18} />,
    },
    {
      label: rincian ? `Hari Praktik ${labelBulan}` : "Hari Praktik",
      value: rincian ? hariPraktik : "-",
      sub: rincian
        ? rincian.bulanBerjalan
          ? `hari kerja s.d. ${formatTanggalPendek(rincian.akhirISO)}`
          : "hari kerja sebulan penuh"
        : "menunggu tanggal",
      tone: "bg-marine",
      icon: <IconCalendar size={18} />,
    },
    {
      label: "Hadir Rata-rata",
      value: adaRata ? `${rataRata}%` : "-",
      sub: adaRata
        ? `dari ${recapAktif.length} siswa aktif`
        : "dibangun dari jurnal harian",
      tone: "bg-mint",
      icon: <IconCheck size={18} />,
    },
    {
      label: rincian?.bulanBerjalan ? "Tanpa Jurnal Hari Ini" : "Tanpa Jurnal",
      value: adaData ? tanpaJurnal : "-",
      sub: rincian
        ? rincian.bulanBerjalan
          ? acuanAkhirPekan
            ? "akhir pekan, belum ada jurnal"
            : "belum mengisi jurnal hari ini"
          : `belum ada jurnal valid s.d. ${formatTanggalPendek(rincian.akhirISO)}`
        : "menunggu data",
      tone: "bg-cherry",
      icon: <IconBell size={18} />,
    },
  ];

  return (
    <div>
      {}
      <div className="mb-6 hidden border-b border-ink/15 pb-4 text-center print:block">
        <p className="text-[11px] font-bold tracking-wide text-ink/70">
          SMK Al Furqon Bantarkawung
        </p>
        <p className="font-display mt-1.5 text-lg sm:text-xl">
          Daftar Hadir Praktik Kerja Lapangan
        </p>
        <p className="mt-1 text-sm font-semibold">
          {rincian ? `Bulan ${labelBulan} ${rincian.tahun}` : ""}
        </p>
        {tglCetak ? (
          <p className="mt-0.5 text-xs font-semibold text-ink/70">
            Tanggal cetak: {tglCetak}
          </p>
        ) : null}
      </div>

      <div className="print:hidden">
        <PageHeader
          title="Daftar Hadir"
          desc={
            rincian
              ? `Kehadiran ${labelBulan} ${rincian.tahun}, dihitung dari jurnal.`
              : "Kehadiran yang dihitung dari jurnal harian."
          }
          action={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {rincian ? (
                <div className="flex items-center gap-2">
                  <Btn
                    size="sm"
                    tone="white"
                    aria-label="Bulan sebelumnya"
                    onClick={() => pindahBulan(-1)}
                  >
                    ‹
                  </Btn>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold shadow-brutal-sm">
                    {labelBulan} {rincian.tahun}
                  </span>
                  <Btn
                    size="sm"
                    tone="white"
                    aria-label="Bulan berikutnya"
                    disabled={rincian.bulanBerjalan}
                    onClick={() => pindahBulan(1)}
                  >
                    ›
                  </Btn>
                </div>
              ) : null}
              <Btn tone="pink" onClick={unduhCSV} disabled={!rincian || !adaData}>
                <IconDownload size={16} /> Unduh CSV
              </Btn>
              <Btn tone="white" onClick={cetak}>
                <IconFile size={16} /> Cetak
              </Btn>
            </div>
          }
        />
      </div>

      {}
      <Panel tone="bg-sun" className="mb-6 p-4 sm:p-5 print:hidden">
        <p className="font-display text-base leading-snug sm:text-lg">
          Kehadiran mengikuti jurnal, tanpa absensi terpisah.
        </p>
        <p className="mt-1 text-xs font-bold tracking-wide text-ink/70">
          Hadir berarti menulis jurnal dan tidak ditolak.
        </p>
      </Panel>

      {}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {}
      {loading ? (
        <LoadingBlock label="Memuat rekap kehadiran…" />
      ) : error ? (
        <Panel role="alert" tone="bg-cherry/40" className="p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat data kehadiran
          </p>
          <p className="mt-1.5 text-sm font-semibold">{error.message}</p>
          <Btn tone="ink" size="sm" className="mt-3" onClick={muatUlang}>
            Coba lagi
          </Btn>
        </Panel>
      ) : rincian ? (
        <>
          <div className="mt-6">
            <SectionTitle
              right={
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold shadow-brutal-sm">
                  {labelRentang}
                </span>
              }
            >
              <span className="flex items-center gap-2">
                <IconCalendar size={18} /> Matriks Kehadiran
              </span>
            </SectionTitle>

            <TableWrap>
              <div className="p-4">
                <table className="w-full min-w-[760px] border-collapse text-left print:min-w-0">
                  <thead>
                    <tr>
                      <Th className="px-3! py-2!">Siswa</Th>
                      {rincian.tanggal.map((d) => (
                        <Th key={d.iso} className="px-1! py-2! text-center!">
                          <span className="block">{d.n}</span>
                          <span className="block text-ink/65">{d.hari}</span>
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {siswa.map((s) => (
                      <tr key={s.id} className={trCls}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={s.nama} size="sm" src={s.akun?.fotoUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{s.nama}</p>
                              <p className="truncate text-[11px] font-semibold text-ink/65">
                                {s.kelas}
                              </p>
                            </div>
                          </div>
                        </td>
                        {rincian.tanggal.map((d) => (
                          <td key={d.iso} className="px-1 py-2 text-center">
                            <span
                              className={`mx-auto block h-7 w-7 rounded-[5px] ${cellTone(
                                setHadir,
                                s.id,
                                d,
                                rincian.akhirISO
                              )}`}
                              title={`${s.nama} · ${d.n} ${labelBulanSingkat} ${rincian.tahun}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableWrap>

            {}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-brutal bg-paper px-4 py-3">
              <Swatch cls="bg-mint" label="Hadir" />
              <Swatch cls="bg-cherry" label="Tidak ada jurnal" />
              <Swatch cls="bg-paper border" label="Akhir pekan" />
              {adaBelumBerjalan ? (
                <Swatch cls="bg-white" label="Belum berjalan" />
              ) : null}
            </div>
          </div>

          {}
          <div className="mt-6">
            <SectionTitle
              right={
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold shadow-brutal-sm">
                  {siswa.length} siswa
                </span>
              }
            >
              <span className="flex items-center gap-2">
                <IconUsers size={18} /> Rekap Kehadiran per Siswa
              </span>
            </SectionTitle>

            <TableWrap>
              <table className="w-full min-w-[680px] text-left text-sm print:min-w-0">
                <thead>
                  <tr>
                    <Th>Siswa</Th>
                    <Th>Hari Hadir {labelBulanSingkat}</Th>
                    <Th>Jurnal Tercatat</Th>
                    <Th>% Kehadiran</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((r) => {
                    const st = statusKehadiran(r.pct);
                    return (
                      <tr key={r.siswa.id} className={trCls}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.siswa.nama} size="sm" />
                            <div className="min-w-0">
                              <p className="font-bold">{r.siswa.nama}</p>
                              <p className="text-[11px] font-semibold text-ink/65">
                                {r.siswa.kelas} · NIS {r.siswa.nis}
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td className="font-display">{r.ada ? r.bulan : "-"}</Td>
                        <Td className="font-semibold text-ink/75">
                          {r.ada ? `${r.jml} jurnal` : "-"}
                        </Td>
                        <Td>
                          <span className="font-display">
                            {r.ada ? `${r.pct}%` : "-"}
                          </span>
                        </Td>
                        <Td>
                          {r.ada ? (
                            <Badge tone={st.tone}>{st.label}</Badge>
                          ) : (
                            <Badge tone="gray">Belum ada data</Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>

            <p className="mt-3 rounded-brutal border bg-white/60 px-4 py-3 text-xs font-semibold text-ink/70">
              Catatan: jurnal yang ditolak tidak dihitung sebagai hadir.
              Persentase kehadiran = hari berjurnal valid pada {labelBulan}{" "}
              {rincian.tahun} ÷ hari kerja sejak jurnal pertama siswa pada bulan
              itu. Kolom “Jurnal Tercatat” adalah total jurnal sepanjang waktu.
            </p>
          </div>
        </>
      ) : null}

      {}
      <div className="print:hidden">
        <Toast show={!!toast}>{toast}</Toast>
      </div>
    </div>
  );
}
