import { all, one, run, newId } from "./db";
import { kirimWa, normalkanNomor, tokenBot } from "./wa";

const FOOTER = "\n\nBina-PKL SMK Al Furqon Bantarkawung";

export async function catatNotifikasi({ userId, jenis = "sistem", judul, pesan = "", tautan = null }) {
  const id = newId();
  await run(
    `INSERT INTO notifikasi (id, user_id, jenis, judul, pesan, tautan)
     VALUES (?,?,?,?,?,?)`,
    [id, userId, jenis, judul, pesan, tautan]
  );
  return id;
}

async function prosesWa(id, nomor, pesan) {
  const hasil = await kirimWa({ nomor, pesan });
  try {
    await run(`UPDATE notifikasi SET wa_status = ?, wa_error = ? WHERE id = ?`, [
      hasil.ok ? "terkirim" : "gagal",
      hasil.ok ? null : hasil.error,
      id,
    ]);
  } catch {
  }
}

function statusAwalWa(nomor) {
  const bersih = normalkanNomor(nomor);
  if (bersih) {
    if (!tokenBot()) return { bersih, status: "gagal", error: "WA_BOT_TOKEN belum diatur." };
    return { bersih, status: "menunggu", error: null };
  }
  const ada = String(nomor ?? "").trim() !== "";
  return {
    bersih: null,
    status: ada ? "nomor_tidak_valid" : "tanpa_nomor",
    error: ada ? "Nomor tidak valid." : null,
  };
}

export async function catatWa({ tujuan, jenis = "sistem", judul, pesan = "", nomor = null }) {
  const { bersih, status, error } = statusAwalWa(nomor);
  const id = newId();
  await run(
    `INSERT INTO notifikasi (id, user_id, jenis, judul, pesan, tujuan, wa_nomor, wa_status, wa_error)
     VALUES (?,NULL,?,?,?,?,?,?,?)`,
    [id, jenis, judul, pesan + FOOTER, tujuan, bersih ?? (String(nomor ?? "").trim() || null), status, error]
  );
  if (status === "menunggu") void await prosesWa(id, bersih, pesan + FOOTER);
  return { id, status };
}

export async function catatWaTunggu({ tujuan, jenis = "pesan", judul, pesan = "", nomor = null }) {
  const { bersih, status: statusAwal, error: errorAwal } = statusAwalWa(nomor);
  const id = newId();
  await run(
    `INSERT INTO notifikasi (id, user_id, jenis, judul, pesan, tujuan, wa_nomor, wa_status, wa_error)
     VALUES (?,NULL,?,?,?,?,?,?,?)`,
    [id, jenis, judul, pesan + FOOTER, tujuan, bersih ?? (String(nomor ?? "").trim() || null), statusAwal, errorAwal]
  );

  if (statusAwal !== "menunggu") {
    return { id, status: statusAwal, error: errorAwal, hasil: null };
  }
  const hasil = await kirimWa({ nomor: bersih, pesan: pesan + FOOTER });
  const status = hasil.ok ? "terkirim" : "gagal";
  const error = hasil.ok ? null : hasil.error;
  await run(`UPDATE notifikasi SET wa_status = ?, wa_error = ? WHERE id = ?`, [status, error, id]);
  return { id, status, error, hasil };
}

export async function penggunaSiswa(siswaId) {
  return (await all("SELECT id FROM users WHERE siswa_id = ?", [siswaId])).map((u) => u.id);
}

export async function penggunaSekolah() {
  return (await all("SELECT id FROM users WHERE role = 'sekolah'")).map((u) => u.id);
}

export async function penggunaDudi(dudiId) {
  if (!dudiId) return [];
  return (await all("SELECT id FROM users WHERE role = 'dudi' AND dudi_id = ?", [dudiId])).map((u) => u.id);
}

export async function beritahuJurnalBaru(jurnal) {
  const siswa = await one(
    "SELECT s.nama, s.dudi_id, d.nama AS dudi_nama, d.kontak AS dudi_kontak FROM siswa s LEFT JOIN dudi d ON d.id = s.dudi_id WHERE s.id = ?",
    [jurnal.siswa_id]
  );
  if (!siswa?.dudi_id) return;

  const judul = `Jurnal baru dari ${siswa.nama}`;
  const pesan = `“${jurnal.judul}” (${jurnal.tanggal}) menunggu verifikasi DUDI.`;
  for (const userId of await penggunaDudi(siswa.dudi_id)) {
    await catatNotifikasi({ userId, jenis: "jurnal", judul, pesan, tautan: "/pembimbing-dudi/verifikasi" });
  }
  await catatWa({
    tujuan: siswa.dudi_nama ?? "Pembimbing DUDI",
    jenis: "jurnal",
    judul,
    pesan: `${siswa.nama} mengirim jurnal “${jurnal.judul}” (${jurnal.tanggal}). Mohon verifikasi melalui aplikasi Bina-PKL.`,
    nomor: siswa.dudi_kontak,
  });
}

export async function beritahuVerifikasiDudi(jurnal, diterima, catatan) {
  const siswa = await one("SELECT s.nama, s.telepon FROM siswa s WHERE s.id = ?", [jurnal.siswa_id]);
  if (!siswa) return;

  if (diterima) {
    const judul = "Jurnal menunggu verifikasi akhir";
    const pesan = `Jurnal ${siswa.nama} “${jurnal.judul}” (${jurnal.tanggal}) sudah lolos verifikasi DUDI.`;
    for (const userId of await penggunaSekolah()) {
      await catatNotifikasi({ userId, jenis: "jurnal", judul, pesan, tautan: "/pembimbing-sekolah/verifikasi" });
    }
    return;
  }

  const judul = "Jurnal dikembalikan pembimbing DUDI";
  const pesan = `“${jurnal.judul}” (${jurnal.tanggal}) dikembalikan: ${catatan || "tanpa catatan"}. Perbaiki lalu kirim ulang.`;
  for (const userId of await penggunaSiswa(jurnal.siswa_id)) {
    await catatNotifikasi({ userId, jenis: "jurnal", judul, pesan, tautan: "/siswa/jurnal" });
  }
  await catatWa({
    tujuan: siswa.nama,
    jenis: "jurnal",
    judul,
    pesan: `Halo ${siswa.nama}, jurnal “${jurnal.judul}” (${jurnal.tanggal}) dikembalikan pembimbing DUDI: ${catatan || "tanpa catatan"}. Mohon diperbaiki di aplikasi Bina-PKL.`,
    nomor: siswa.telepon,
  });
}

export async function beritahuVerifikasiSekolah(jurnal, diterima, catatan) {
  const siswa = await one("SELECT s.nama, s.telepon FROM siswa s WHERE s.id = ?", [jurnal.siswa_id]);
  if (!siswa) return;

  const judul = diterima ? "Jurnal diterima" : "Jurnal dikembalikan sekolah";
  const pesan = diterima
    ? `“${jurnal.judul}” (${jurnal.tanggal}) sudah diterima pembimbing sekolah.`
    : `“${jurnal.judul}” (${jurnal.tanggal}) dikembalikan: ${catatan || "tanpa catatan"}.`;
  for (const userId of await penggunaSiswa(jurnal.siswa_id)) {
    await catatNotifikasi({ userId, jenis: "jurnal", judul, pesan, tautan: "/siswa/jurnal" });
  }
  await catatWa({
    tujuan: siswa.nama,
    jenis: "jurnal",
    judul,
    pesan: diterima
      ? `Halo ${siswa.nama}, jurnal “${jurnal.judul}” (${jurnal.tanggal}) sudah DITERIMA pembimbing sekolah. Pertahankan!`
      : `Halo ${siswa.nama}, jurnal “${jurnal.judul}” (${jurnal.tanggal}) dikembalikan pembimbing sekolah: ${catatan || "tanpa catatan"}. Mohon diperbaiki di aplikasi Bina-PKL.`,
    nomor: siswa.telepon,
  });
}

export async function beritahuLaporanBaru(laporan, { revisi = false } = {}) {
  const siswa = await one("SELECT nama FROM siswa WHERE id = ?", [laporan.siswa_id]);
  if (!siswa) return;

  const judul = revisi ? `Revisi laporan dari ${siswa.nama}` : `Laporan baru dari ${siswa.nama}`;
  const pesan = `“${laporan.judul}” v${laporan.versi} menunggu review.`;
  for (const userId of await penggunaSekolah()) {
    await catatNotifikasi({ userId, jenis: "laporan", judul, pesan, tautan: "/pembimbing-sekolah/laporan" });
  }
}

export async function beritahuReviewLaporan(laporan, diterima, catatan) {
  const siswa = await one("SELECT nama, telepon FROM siswa WHERE id = ?", [laporan.siswa_id]);
  if (!siswa) return;

  const judul = diterima ? "Laporan diterima" : "Laporan perlu revisi";
  const pesan = diterima
    ? `“${laporan.judul}” v${laporan.versi} sudah diterima pembimbing sekolah.`
    : `“${laporan.judul}” v${laporan.versi} perlu revisi: ${catatan || "tanpa catatan"}.`;
  for (const userId of await penggunaSiswa(laporan.siswa_id)) {
    await catatNotifikasi({ userId, jenis: "laporan", judul, pesan, tautan: "/siswa/laporan" });
  }
  await catatWa({
    tujuan: siswa.nama,
    jenis: "laporan",
    judul,
    pesan: diterima
      ? `Halo ${siswa.nama}, laporan “${laporan.judul}” v${laporan.versi} sudah DITERIMA pembimbing sekolah.`
      : `Halo ${siswa.nama}, laporan “${laporan.judul}” v${laporan.versi} perlu revisi: ${catatan || "tanpa catatan"}. Mohon unggah revisinya di aplikasi Bina-PKL.`,
    nomor: siswa.telepon,
  });
}

export const PESAN_PENGINGAT =
  "Halo {nama}, jurnal harian PKL kamu hari ini belum diisi. Mohon segera mengisi jurnal, ya.";

export const MAKS_KIRIM_PENGINGAT = 25;

export async function kirimPengingatJurnal({
  pesanKustom = "",
  maksKirim = MAKS_KIRIM_PENGINGAT,
  siswaIds = null,
  hanyaYangBelum = true,
} = {}) {
  const pilih = (siswaIds ?? []).filter(Boolean);
  const syarat =
    pilih.length > 0
      ? `s.id IN (${pilih.map(() => "?").join(",")})`
      : `s.status = 'aktif' AND s.dudi_id IS NOT NULL`;

  const saringBelum = hanyaYangBelum
    ? `AND NOT EXISTS (
         SELECT 1 FROM jurnal j
         WHERE j.siswa_id = s.id AND j.tanggal = CURDATE()
       )`
    : "";

  const target = await all(
    `SELECT s.* FROM siswa s
     WHERE ${syarat}
       ${saringBelum}
     ORDER BY s.nama`,
    pilih
  );

  const semuaTarget = await all(
    `SELECT s.* FROM siswa s
     WHERE s.status = 'aktif' AND s.dudi_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM jurnal j
         WHERE j.siswa_id = s.id AND j.tanggal = CURDATE()
       )
     ORDER BY s.nama`
  );

  const patokan = pilih.length > 0 ? target : semuaTarget;

  const tpl = String(pesanKustom ?? "").trim() || PESAN_PENGINGAT;
  const isi = (siswa) =>
    tpl.replaceAll("{nama}", siswa.nama).replaceAll("{nis}", siswa.nis ?? "");

  const hasil = [];
  let terkirim = 0;
  let gagal = 0;
  let tanpaNomor = 0;
  let dilewati = 0;
  let dicoba = 0;

  for (const siswa of target) {
    const pesan = isi(siswa);

    for (const userId of await penggunaSiswa(siswa.id)) {
      await catatNotifikasi({
        userId,
        jenis: "pengingat",
        judul: "Pengingat jurnal harian",
        pesan,
        tautan: "/siswa/jurnal",
      });
    }

    if (!normalkanNomor(siswa.telepon)) {
      tanpaNomor++;
      hasil.push({ nama: siswa.nama, nomor: null, status: "tanpa_nomor", error: null });
      continue;
    }
    if (dicoba >= maksKirim) {
      dilewati++;
      continue;
    }
    dicoba++;
    const r = await catatWaTunggu({
      tujuan: siswa.nama,
      jenis: "pengingat",
      judul: "Pengingat jurnal harian",
      pesan,
      nomor: siswa.telepon,
    });
    hasil.push({ nama: siswa.nama, nomor: siswa.telepon, status: r.status, error: r.error });
    if (r.status === "terkirim") terkirim++;
    else if (r.status === "gagal") gagal++;
    else tanpaNomor++;

    if (r.error?.includes("Batas kirim")) {
      dilewati += target.length - hasil.length;
      break;
    }
  }

  return { total: patokan.length, terkirim, gagal, tanpaNomor, dilewati, hasil };
}
