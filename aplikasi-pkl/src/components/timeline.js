"use client";

import { Badge } from "@/components/ui";
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconSend,
  IconX,
} from "@/components/icons";
import { formatWaktu } from "@/lib/calc";

const AKSI = {
  kirim: { label: "Laporan dikirim", tone: "yellow", Ikon: IconSend },
  revisi: { label: "Revisi", tone: "orange", Ikon: IconEdit },
  terima: { label: "Diterima", tone: "green", Ikon: IconCheck },
};

const PERAN = { siswa: "Siswa", sekolah: "Sekolah", admin: "Admin", dudi: "DUDI" };

function labelAksi(r) {
  if (r.aksi === "revisi") {
    return r.peran === "siswa" ? "Revisi diunggah" : "Diminta revisi";
  }
  return AKSI[r.aksi]?.label ?? r.aksi;
}

export function RiwayatLaporan({ riwayat = [], kosong = "Belum ada riwayat." }) {
  if (!riwayat.length) {
    return (
      <p className="rounded-brutal border bg-white/60 p-3 text-xs font-semibold text-ink/65">
        {kosong}
      </p>
    );
  }

  return (
    <ol className="grid gap-2">
      {riwayat.map((r) => {
        const meta = AKSI[r.aksi] ?? AKSI.kirim;
        const Ikon = r.aksi === "revisi" && r.peran !== "siswa" ? IconX : meta.Ikon;
        return (
          <li
            key={r.id}
            className="rounded-brutal bg-white/80 p-3 shadow-brutal-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                <Ikon size={14} /> {labelAksi(r)}
                {r.versi != null ? (
                  <span className="text-[11px] font-bold tracking-wide text-ink/65">
                    v{r.versi}
                  </span>
                ) : null}
              </span>
              <Badge tone={meta.tone}>{PERAN[r.peran] ?? r.peran ?? "-"}</Badge>
            </div>
            <p className="mt-1 text-[11px] font-bold tracking-wide text-ink/65">
              {r.oleh || "-"} · {formatWaktu(r.waktu, true)}
            </p>
            {r.catatan ? (
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-ink/80">
                “{r.catatan}”
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function VerifikasiTimeline({ jurnal }) {
  if (!jurnal) return null;

  const tahap = [
    {
      kunci: "dudi",
      label: "Tahap 1: Pembimbing DUDI",
      at: jurnal.verifikasiDudiAt,
      hasil: jurnal.verifikasiDudiHasil,
      oleh: jurnal.verifikasiDudiOleh,
      catatan: jurnal.catatanDudi,
    },
    {
      kunci: "sekolah",
      label: "Tahap 2: Pembimbing sekolah",
      at: jurnal.verifikasiSekolahAt,
      hasil: jurnal.verifikasiSekolahHasil,
      oleh: jurnal.verifikasiSekolahOleh,
      catatan: jurnal.catatanSekolah,
    },
  ];

  return (
    <ol className="grid gap-2">
      {tahap.map((t) => {
        const ada = !!t.at;
        const terima = t.hasil === "terima";
        return (
          <li
            key={t.kunci}
            className={`rounded-brutal p-3 ${
              ada ? (terima ? "bg-mint/40" : "bg-cherry/30") : "bg-white/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wide text-ink/70">
                {t.label}
              </span>
              <Badge tone={ada ? (terima ? "green" : "red") : "gray"}>
                {ada ? (
                  terima ? (
                    <>
                      <IconCheck size={12} /> Diterima
                    </>
                  ) : (
                    <>
                      <IconX size={12} /> Ditolak
                    </>
                  )
                ) : (
                  <>
                    <IconClock size={12} /> Menunggu
                  </>
                )}
              </Badge>
            </div>
            {ada ? (
              <>
                <p className="mt-1.5 text-sm font-bold">{t.oleh || "-"}</p>
                <p className="text-[11px] font-semibold text-ink/65">
                  {formatWaktu(t.at, true)}
                </p>
                {t.catatan ? (
                  <p className="mt-1 text-xs font-medium leading-relaxed text-ink/80">
                    “{t.catatan}”
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs font-semibold text-ink/65">
                Belum ada keputusan pada tahap ini.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
