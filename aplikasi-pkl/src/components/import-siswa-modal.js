"use client";

import { useRef, useState } from "react";
import { Modal, Btn, Badge, Progress } from "@/components/ui";
import { IconUpload, IconDownload, IconCheck, IconX } from "@/components/icons";
import { api } from "@/lib/api";
import { siapkanImpor } from "@/lib/xlsx-import";
import { DOMAIN_EMAIL } from "@/lib/domain";

const POTONGAN = 50;
const TAMPIL = 12;

export default function ImportSiswaModal({
  open,
  onClose,
  nisTerdaftar = [],
  mitraDikenal = [],
  kelasDikenal = [],
  onSelesai,
}) {
  const [tahap, setTahap] = useState("pilih");
  const [namaFile, setNamaFile] = useState("");
  const [data, setData] = useState(null);
  const [galatFile, setGalatFile] = useState("");
  const [hasil, setHasil] = useState(null);
  const [pending, setPending] = useState(false);
  const [progres, setProgres] = useState(0);
  const epoch = useRef(0);

  function tutup() {
    if (tahap === "jalan") return;
    epoch.current++;
    setTahap("pilih");
    setNamaFile("");
    setData(null);
    setGalatFile("");
    setHasil(null);
    setProgres(0);
    setPending(false);
    onClose();
  }

  async function prosesFile(file) {
    if (!file) return;
    const e = epoch.current;
    setGalatFile("");
    setData(null);
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      setGalatFile("Format harus .xlsx atau .xlsm.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setGalatFile("Ukuran berkas maksimal 5 MB.");
      return;
    }
    setPending(true);
    setNamaFile(file.name);
    try {
      const mod = await import("read-excel-file/browser");
      const lembar = await mod.default(file);
      if (e !== epoch.current) return;
      const isi = siapkanImpor(lembar?.[0]?.data ?? [], {
        nisTerdaftar,
        mitraDikenal,
        kelasDikenal,
      });
      if (isi.galat) {
        setGalatFile(isi.galat);
        setNamaFile("");
      } else if (isi.siap.length > 1000) {
        setGalatFile(
          `${isi.siap.length} baris siap diimpor. Maksimal 1.000 baris per berkas. Pisahkan berkas lalu impor bertahap (impor aman diulang).`
        );
        setNamaFile("");
      } else {
        setData(isi);
        setTahap("pratinjau");
      }
    } catch {
      setGalatFile(
        "File tidak bisa dibaca. Pastikan berkas Excel asli (.xlsx), bukan CSV atau templat yang rusak."
      );
      setNamaFile("");
    } finally {
      setPending(false);
    }
  }

  async function jalankan() {
    if (!data?.siap?.length) return;
    const e = epoch.current;
    const total = data.siap.length;
    setTahap("jalan");
    setPending(true);
    setProgres(0);
    let dibuat = 0;
    let lewat = 0;
    let galat = 0;
    const semua = [];
    try {
      for (let i = 0; i < total; i += POTONGAN) {
        const potongan = data.siap.slice(i, i + POTONGAN);
        const res = await api("/api/siswa/import", {
          method: "POST",
          body: { rows: potongan },
        });
        if (e !== epoch.current) return;
        semua.push(...res.hasil);
        dibuat += res.dibuat;
        lewat += res.lewat;
        galat += res.galat;
        setProgres(Math.min(100, Math.round(((i + potongan.length) / total) * 100)));
      }
      setHasil({ dibuat, lewat, galat, baris: semua });
      setTahap("hasil");
    } catch (err) {
      if (e !== epoch.current) return;
      setGalatFile(err.message);
      setTahap("pratinjau");
    } finally {
      if (e === epoch.current) {
        setPending(false);
        setProgres(0);
      }
    }
  }

  const siap = data?.siap ?? [];
  const bermasalah = (data?.baris ?? []).filter((b) => b.masalah.length > 0);
  const masalahTampil = (hasil?.baris ?? []).filter((b) => b.status !== "ok");

  return (
    <Modal open={open} onClose={tutup} title="Impor Siswa dari Excel">
      {tahap === "pilih" && (
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-ink/75">
            Isi template (<b>NO · NIS · NAMA · KELAS · MITRA</b>), lalu unggah:
            kolom <b>NIS</b> dan <b>Nama</b> wajib; <b>Kelas</b> dan{" "}
            <b>Mitra</b> opsional. Kolom <b>KELAS</b> & <b>MITRA</b> di
            template sudah berupa dropdown sesuai data terkini. Unduh ulang
            template bila ada kelas atau mitra yang baru ditambahkan.
          </p>

          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-brutal border border border-ink bg-paper px-6 py-8 text-center shadow-brutal-sm transition-all  hover:bg-sun/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              prosesFile(e.dataTransfer.files?.[0]);
            }}
          >
            <IconUpload size={30} />
            <span className="font-black">Klik atau seret berkas ke sini</span>
            <span className="text-sm font-semibold text-ink/70">
              {namaFile || "Belum ada berkas dipilih"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                prosesFile(file);
              }}
            />
          </label>

          {galatFile && (
            <p className="rounded-brutal bg-cherry/25 px-3 py-2 text-sm font-bold">
              {galatFile}
            </p>
          )}
          {pending && (
            <p className="text-sm font-bold tracking-wide">
              Membaca berkas…
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
            <Btn tone="white" href="/api/siswa/template" download>
              <IconDownload size={16} /> Unduh Template
            </Btn>
            <Btn tone="white" onClick={tutup}>
              Batal
            </Btn>
          </div>
        </div>
      )}

      {tahap === "pratinjau" && data && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">
              <IconCheck size={12} /> {siap.length} siap diimpor
            </Badge>
            {bermasalah.length > 0 && (
              <Badge tone="red">
                <IconX size={12} /> {bermasalah.length} bermasalah
              </Badge>
            )}
            {data.kosong > 0 && <Badge tone="gray">{data.kosong} baris kosong dilewati</Badge>}
          </div>

          <p className="text-sm font-semibold text-ink/75">
            Pratinjau {Math.min(TAMPIL, data.baris.length)} dari {data.baris.length}{" "}
            baris pada <b>{namaFile}</b>. Baris bermasalah tidak akan diimpor.
            Sandi awal tiap akun = NIS-nya.
          </p>

          <div className="max-h-64 overflow-auto rounded-brutal">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-ink text-white">
                <tr>
                  {["Baris", "NIS", "Nama", "Kelas", "Mitra", "Status"].map((h) => (
                    <th
                      key={h}
                      className="border-r border-white/25 px-2.5 py-1.5 text-left font-black text-[11px] tracking-wide last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.baris.slice(0, TAMPIL).map((b) => (
                  <tr key={b.baris} className="odd:bg-white even:bg-paper">
                    <td className="border-r border-ink/15 px-2.5 py-1.5 font-semibold text-ink/65">
                      {b.baris}
                    </td>
                    <td className="border-r border-ink/15 px-2.5 py-1.5 font-semibold">
                      {b.nis || "-"}
                    </td>
                    <td className="border-r border-ink/15 px-2.5 py-1.5 font-bold">
                      {b.nama || "-"}
                    </td>
                    <td className="border-r border-ink/15 px-2.5 py-1.5">{b.kelas || "-"}</td>
                    <td className="border-r border-ink/15 px-2.5 py-1.5">{b.mitra || "-"}</td>
                    <td className="px-2.5 py-1.5">
                      {b.masalah.length === 0 ? (
                        <Badge tone="green">Siap</Badge>
                      ) : (
                        <span className="font-bold text-ink">
                          {b.masalah.join(" · ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bermasalah.length > 0 && (
            <p className="text-sm font-semibold text-ink/70">
              {bermasalah.length} baris dilewati otomatis. Perbaiki berkas lalu
              impor ulang (impor bersifat aman diulang; data tersimpan tidak
              tertimpa).
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
            <Btn tone="ink" onClick={jalankan} disabled={!siap.length}>
              Impor {siap.length} Siswa
            </Btn>
            <Btn tone="white" onClick={() => setTahap("pilih")}>
              Ganti Berkas
            </Btn>
            <Btn tone="white" onClick={tutup}>
              Batal
            </Btn>
          </div>
        </div>
      )}

      {tahap === "jalan" && (
        <div className="grid gap-4">
          <p className="font-black">Mengimpor {siap.length} siswa…</p>
          <Progress value={progres} />
          <p className="text-sm font-semibold text-ink/70">
            {progres}%, tiap siswa membuat akun login (NIS@{DOMAIN_EMAIL}).
            Jangan tutup jendela ini.
          </p>
        </div>
      )}

      {tahap === "hasil" && hasil && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">
              <IconCheck size={12} /> {hasil.dibuat} siswa + akun dibuat
            </Badge>
            {hasil.lewat > 0 && <Badge tone="gray">{hasil.lewat} dilewati</Badge>}
            {hasil.galat > 0 && (
              <Badge tone="red">
                <IconX size={12} /> {hasil.galat} galat
              </Badge>
            )}
          </div>

          {masalahTampil.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-brutal bg-paper p-3 text-sm">
              <ul className="grid gap-1.5">
                {masalahTampil.slice(0, 8).map((b, i) => (
                  <li key={i} className="font-semibold">
                    <span className="font-black">{b.nis || `baris ${i + 1}`}</span>:{" "}
                    {b.pesan}
                  </li>
                ))}
                {masalahTampil.length > 8 && (
                  <li className="font-bold text-ink/65">
                    …dan {masalahTampil.length - 8} lainnya.
                  </li>
                )}
              </ul>
            </div>
          )}

          <p className="text-sm font-semibold text-ink/75">
            {hasil.dibuat > 0
              ? `Akun baru dapat login dengan NIS + sandi awal = NIS.`
              : "Tidak ada siswa baru yang ditambahkan."}
          </p>

          <div className="border-t border-ink/15 pt-4">
            <Btn
              tone="ink"
              onClick={() => {
                tutup();
                onSelesai?.(hasil);
              }}
            >
              Selesai
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
