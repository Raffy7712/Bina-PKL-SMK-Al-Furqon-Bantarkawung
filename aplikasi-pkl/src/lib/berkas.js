import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { run, one, all, newId } from "./db";

export const MAKS_UKURAN = 10 * 1024 * 1024;
export const MAKS_BERKAS_PER_KIRIM = 5;

export const TIPE_DIIZINKAN = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
};

const DIR =
  process.env.PKL_BERKAS_DIR ?? join(process.cwd(), "data", "berkas");

function extDari(nama) {
  return extname(String(nama ?? "")).slice(1).toLowerCase();
}

const mulai = (buf, bytes) =>
  bytes.every((b, i) => buf[i] === b);

const teks = (buf, str, offset = 0) =>
  buf.slice(offset, offset + str.length).toString("latin1") === str;

function zipBerisi(buf, penanda) {
  return buf.includes(Buffer.from(penanda, "latin1"));
}

export function isiSesuai(buf, ext) {
  if (!buf?.length) return false;
  switch (ext) {
    case "jpg":
    case "jpeg":
      return mulai(buf, [0xff, 0xd8, 0xff]);
    case "png":
      return mulai(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "gif":
      return teks(buf, "GIF87a") || teks(buf, "GIF89a");
    case "webp":
      return teks(buf, "RIFF") && teks(buf, "WEBP", 8);
    case "pdf":
      return teks(buf, "%PDF");
    case "docx":
      return mulai(buf, [0x50, 0x4b, 0x03, 0x04]) && zipBerisi(buf, "word/");
    case "xlsx":
      return mulai(buf, [0x50, 0x4b, 0x03, 0x04]) && zipBerisi(buf, "xl/");
    case "pptx":
      return mulai(buf, [0x50, 0x4b, 0x03, 0x04]) && zipBerisi(buf, "ppt/");
    case "ppt":
      return mulai(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    default:
      return false;
  }
}

export function periksaBerkas({ nama, ukuran, buf }) {
  const ext = extDari(nama);
  if (!TIPE_DIIZINKAN[ext]) {
    return "Tipe berkas tidak diizinkan. Pakai gambar, PDF, DOCX, XLSX, atau PPT.";
  }
  if (!Number.isFinite(ukuran) || ukuran <= 0) return "Berkas kosong.";
  if (ukuran > MAKS_UKURAN) return "Ukuran berkas melebihi 10 MB.";
  if (!isiSesuai(buf, ext)) {
    return "Isi berkas tidak cocok dengan ekstensinya. Berkas ditolak.";
  }
  return null;
}

export const MAKS_FOTO = 2 * 1024 * 1024;
const TIPE_FOTO = ["jpg", "jpeg", "png", "webp"];

export function simpanFoto({ nama, ukuran, buf }) {
  const ext = extDari(nama);
  if (!TIPE_FOTO.includes(ext)) {
    return { galat: "Foto harus berformat JPG, PNG, atau WEBP." };
  }
  if (!Number.isFinite(ukuran) || ukuran <= 0) return { galat: "Berkas kosong." };
  if (ukuran > MAKS_FOTO) return { galat: "Ukuran foto maksimal 2 MB." };
  if (!isiSesuai(buf, ext)) {
    return { galat: "Isi berkas tidak cocok dengan ekstensinya. Foto ditolak." };
  }
  mkdirSync(DIR, { recursive: true });
  const file = `foto-${newId()}.${ext}`;
  writeFileSync(join(DIR, file), buf);
  return { file };
}

export function pathFoto(nama) {
  const aman = String(nama ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!aman) return null;
  const full = join(DIR, aman);
  return existsSync(full) ? full : null;
}

export function mimeFoto(nama) {
  const ext = extDari(nama);
  return TIPE_FOTO.includes(ext) ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/octet-stream";
}

export function hapusFoto(nama) {
  const full = pathFoto(nama);
  if (!full) return;
  try {
    unlinkSync(full);
  } catch {
  }
}

export async function simpanBerkas({ nama, mime, ukuran, buf, siswaId, jurnalId, laporanId }) {
  mkdirSync(DIR, { recursive: true });
  const ext = extDari(nama);
  const id = newId();
  const file = `${id}.${ext}`;
  writeFileSync(join(DIR, file), buf);
  await run(
    `INSERT INTO berkas (id, siswa_id, jurnal_id, laporan_id, nama, mime, ukuran, path)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      siswaId,
      jurnalId ?? null,
      laporanId ?? null,
      String(nama).slice(0, 200),
      mime || TIPE_DIIZINKAN[ext],
      ukuran,
      file,
    ]
  );
  return await one("SELECT * FROM berkas WHERE id = ?", [id]);
}

export async function listBerkas({ jurnalId, laporanId, siswaId } = {}) {
  if (jurnalId) return await all("SELECT * FROM berkas WHERE jurnal_id = ? ORDER BY created_at", [jurnalId]);
  if (laporanId) return await all("SELECT * FROM berkas WHERE laporan_id = ? ORDER BY created_at", [laporanId]);
  if (siswaId) return await all("SELECT * FROM berkas WHERE siswa_id = ? ORDER BY created_at", [siswaId]);
  return [];
}

export async function petaBerkas(ids, kolom = "jurnal_id") {
  const bersih = (ids ?? []).filter(Boolean);
  if (!bersih.length) return {};
  if (kolom !== "jurnal_id" && kolom !== "laporan_id") return {};
  const rows = await all(
    `SELECT * FROM berkas WHERE ${kolom} IN (${bersih.map(() => "?").join(",")})`,
    bersih
  );
  const peta = {};
  for (const r of rows) (peta[r[kolom]] ??= []).push(serializeBerkas(r));
  return peta;
}

export async function getBerkas(id) {
  return await one("SELECT * FROM berkas WHERE id = ?", [id]);
}

export function pathBerkas(row) {
  if (!row?.path) return null;
  const aman = String(row.path).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!aman) return null;
  const full = join(DIR, aman);
  return existsSync(full) ? full : null;
}

export async function hapusBerkas(id, siswaId) {
  const row = await one("SELECT * FROM berkas WHERE id = ? AND siswa_id = ?", [id, siswaId]);
  if (!row) return false;
  const full = pathBerkas(row);
  if (full) {
    try {
      unlinkSync(full);
    } catch {
    }
  }
  await run("DELETE FROM berkas WHERE id = ?", [id]);
  return true;
}

export function serializeBerkas(row) {
  if (!row) return null;
  return {
    id: row.id,
    nama: row.nama,
    mime: row.mime ?? "",
    ukuran: row.ukuran ?? 0,
    ukuranTeks: ukuranTeks(row.ukuran),
    url: `/api/berkas/${row.id}`,
  };
}

export function ukuranTeks(b) {
  const n = Number(b);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
