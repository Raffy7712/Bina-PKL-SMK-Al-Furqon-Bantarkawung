"use client";

import { Modal, Badge, Btn, LoadingBlock, LaporanBadge } from "@/components/ui";
import { VerifikasiTimeline, RiwayatLaporan } from "@/components/timeline";
import { IconFile, IconPin, IconClock, IconCheck, IconX } from "@/components/icons";
import { formatWaktu } from "@/lib/calc";
import { useApi } from "@/lib/api";

const MICRO =
  "text-[11px] font-medium text-ink/65";

function Baris({ label, children }) {
  if (children == null || children === "") return null;
  return (
    <div className="grid gap-0.5">
      <span className={MICRO}>{label}</span>
      <span className="text-sm font-normal leading-relaxed">{children}</span>
    </div>
  );
}

export function JurnalDetail({ id, onClose }) {
  const { data, error, loading } = useApi(id ? `/api/jurnal/${id}` : null);

  const j = data?.jurnal;
  const ck = data?.checkin;

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title="Detail Jurnal"
      footer={
        <Btn tone="white" onClick={onClose}>
          Tutup
        </Btn>
      }
    >
      {loading ? <LoadingBlock label="Memuat detail jurnal…" /> : null}
      {error ? (
        <p className="rounded-brutal bg-cherry/20 p-3 text-sm font-normal">
          {error.message}
        </p>
      ) : null}

      {j ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold leading-tight">{j.judul}</p>
              <p className="mt-0.5 text-sm font-normal text-ink/60">
                {data.siswa?.nama} · NIS {data.siswa?.nis} · {data.siswa?.kelas}
              </p>
            </div>
            <Badge tone={j.status === "diterima" ? "green" : j.status === "ditolak" ? "red" : "yellow"}>
              {j.status.replaceAll("_", " ")}
            </Badge>
          </div>

          <div className="grid gap-3 rounded-brutal bg-paper p-3 sm:grid-cols-2">
            <Baris label="Tanggal">{j.tanggal}</Baris>
            <Baris label="Jam masuk / keluar">
              {j.masuk || "-"} / {j.keluar || "-"}
            </Baris>
            <Baris label="Tempat PKL">{j.dudiNama || data.siswa?.dudiNama || "-"}</Baris>
            <Baris label="Ditulis">{j.dibuat ? formatWaktu(j.dibuat, true) : "-"}</Baris>
          </div>

          <Baris label="Uraian kegiatan">
            <span className="whitespace-pre-line">{j.kegiatan || "-"}</span>
          </Baris>

          <div>
            <p className={`mb-1.5 ${MICRO}`}>Lampiran</p>
            {j.berkas?.length ? (
              <ul className="grid gap-1.5">
                {j.berkas.map((b) => (
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
            ) : j.lampiranList?.length ? (
              <ul className="grid gap-1.5">
                {j.lampiranList.map((nama, i) => (
                  <li
                    key={`${nama}-${i}`}
                    className="flex items-center gap-2 rounded-brutal bg-paper px-3 py-2 text-sm font-normal text-ink/60"
                  >
                    <IconFile size={15} /> {nama} (berkas lama, tidak tersimpan)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-normal text-ink/60">Tidak ada lampiran.</p>
            )}
          </div>

          <div>
            <p className={`mb-2 ${MICRO}`}>Riwayat verifikasi</p>
            <VerifikasiTimeline jurnal={j} />
          </div>

          {ck ? (
            <div className="rounded-brutal bg-paper p-3">
              <p className={`mb-2 ${MICRO}`}>Check-in GPS hari itu</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Baris label="Waktu">
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={13} /> {formatWaktu(ck.created_at, true)}
                  </span>
                </Baris>
                <Baris label="Jarak dari titik PKL">
                  <span className="inline-flex items-center gap-1.5">
                    <IconPin size={13} /> {ck.jarak_m != null ? `${Math.round(ck.jarak_m)} m` : "-"}
                    {ck.radius_m ? ` (radius ${ck.radius_m} m)` : ""}
                  </span>
                </Baris>
                <Baris label="Akurasi GPS">
                  {ck.akurasi_m != null ? `±${Math.round(ck.akurasi_m)} m` : "-"}
                </Baris>
                <Baris label="Koordinat">
                  {ck.lat != null ? `${ck.lat}, ${ck.lng}` : "-"}
                </Baris>
              </div>
            </div>
          ) : (
            <p className="rounded-brutal bg-paper p-3 text-sm font-normal text-ink/60">
              Tidak ada check-in GPS pada tanggal ini.
            </p>
          )}

          <div className="grid gap-2">
            {j.catatanDudi ? (
              <p className="rounded-brutal bg-paper p-3 text-sm font-normal">
                <span className={`mr-2 ${MICRO}`}>Catatan DUDI</span>“{j.catatanDudi}”
              </p>
            ) : null}
            {j.catatanSekolah ? (
              <p className="rounded-brutal bg-paper p-3 text-sm font-normal">
                <span className={`mr-2 ${MICRO}`}>Catatan sekolah</span>“
                {j.catatanSekolah}”
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function LaporanDetail({ id, onClose }) {
  const { data, error, loading } = useApi(id ? `/api/laporan/${id}` : null);

  const l = data?.laporan;
  const rubrik = l?.penilaian
    ? [
        ["Kelengkapan isi", l.penilaian.isi],
        ["Kerapian & format", l.penilaian.format],
        ["Analisis & pembahasan", l.penilaian.analisis],
        ["Presentasi lisan", l.penilaian.presentasi],
      ]
    : [];

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title="Detail Laporan"
      footer={
        <Btn tone="white" onClick={onClose}>
          Tutup
        </Btn>
      }
    >
      {loading ? <LoadingBlock label="Memuat detail laporan…" /> : null}
      {error ? (
        <p className="rounded-brutal bg-cherry/20 p-3 text-sm font-normal">
          {error.message}
        </p>
      ) : null}

      {l ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold leading-tight">{l.judul}</p>
              <p className="mt-0.5 text-sm font-normal text-ink/60">
                {l.siswaNama || "-"} · versi {l.versi}
              </p>
            </div>
            <LaporanBadge status={l.status} />
          </div>

          <div className="grid gap-3 rounded-brutal bg-paper p-3 sm:grid-cols-2">
            <Baris label="Ukuran berkas">{l.ukuran || "-"}</Baris>
            <Baris label="Halaman">{l.halaman ?? "-"}</Baris>
            <Baris label="Diperbarui">{l.diperbarui || "-"}</Baris>
            <Baris label="Nilai akhir">
              {l.nilaiAkhir != null ? `${l.nilaiAkhir} / 100` : "Belum dinilai"}
            </Baris>
          </div>

          <div>
            <p className={`mb-1.5 ${MICRO}`}>Berkas laporan</p>
            {l.berkas?.length ? (
              <ul className="grid gap-1.5">
                {l.berkas.map((b) => (
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

          <Baris label="Catatan penguji">{l.feedback || "-"}</Baris>
          <Baris label="Jawaban siswa">{l.jawaban || "-"}</Baris>

          {rubrik.length ? (
            <div>
              <p className={`mb-2 ${MICRO}`}>Rubrik penilaian</p>
              <ul className="grid gap-1.5">
                {rubrik.map(([label, nilai]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-brutal bg-paper px-3 py-2 text-sm font-normal"
                  >
                    <span>{label}</span>
                    <span className="font-semibold">{nilai}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className={`mb-2 ${MICRO}`}>Timeline laporan</p>
            <RiwayatLaporan riwayat={data.riwayat ?? []} />
          </div>

          <p className="flex items-center gap-2 text-xs font-normal text-ink/60">
            <IconCheck size={13} /> Hanya gambar, PDF, DOCX, XLSX, dan PPT yang
            diterima. Berkas diperiksa dari isinya, bukan dari namanya.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export function StatusIkon({ status }) {
  if (status === "diterima") return <IconCheck size={13} />;
  if (status === "ditolak" || status === "revisi") return <IconX size={13} />;
  return <IconClock size={13} />;
}
