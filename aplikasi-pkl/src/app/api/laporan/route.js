import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, newId, one } from "@/lib/db";
import {
  listLaporan,
  countLaporan,
  serializeLaporan,
  catatRiwayatLaporan,
  LAPORAN_STATUS_VALID,
} from "@/lib/serialize";
import { beritahuLaporanBaru } from "@/lib/notifikasi";
import {
  getBerkas,
  listBerkas,
  serializeBerkas,
  hapusBerkas,
  petaBerkas,
} from "@/lib/berkas";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

export async function GET(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  let siswaId = params.get("siswaId") ?? undefined;
  let dudiId = undefined;
  const statusRaw = params.get("status");
  const status = statusRaw
    ? statusRaw.split(",").map((s) => s.trim()).filter((s) => LAPORAN_STATUS_VALID.includes(s))
    : undefined;
  if (statusRaw && status.length === 0) {
    return NextResponse.json({ laporan: [], total: 0, limit: null, offset: 0 });
  }
  if (user.role === "siswa") siswaId = user.siswa_id;
  if (user.role === "dudi") {
    if (!user.dudi_id) {
      return NextResponse.json({ laporan: [], total: 0, limit: null, offset: 0 });
    }
    dudiId = user.dudi_id;
  }

  const semua = params.get("semua") === "1";
  const limit = semua
    ? null
    : Math.min(Math.max(parseInt(params.get("limit"), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(params.get("offset"), 10) || 0, 0);

  const filters = { siswaId, dudiId, status };
  const laporan = await listLaporan({ ...filters, limit, offset });
  const peta = await petaBerkas(laporan.map((l) => l.id), "laporan_id");
  for (const l of laporan) l.berkas = peta[l.id] ?? [];
  return NextResponse.json({
    laporan,
    total: await countLaporan(filters),
    limit,
    offset,
  });
}

export async function POST(request) {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { judul, berkas, revisiDari, jawaban, berkasIds } = body;
  if (!judul?.trim()) {
    return NextResponse.json({ error: "Judul laporan wajib diisi" }, { status: 400 });
  }
  const catatanJawaban = String(jawaban ?? "").trim().slice(0, 2000);

  const ukuranDari = (v) => {
    if (v == null || v === "") return null;
    if (typeof v === "string" && /[A-Za-z]/.test(v)) return v;
    const b = Number(v);
    if (!Number.isFinite(b)) return null;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };
  const ids = Array.isArray(berkasIds) ? berkasIds.filter(Boolean) : [];
  const milikSaya = (
    await Promise.all(ids.map((bid) => getBerkas(bid)))
  ).filter((b) => b && b.siswa_id === user.siswa_id && !b.jurnal_id && !b.laporan_id);

  const ukuranBaru = milikSaya.length
    ? ukuranDari(milikSaya[0].ukuran)
    : ukuranDari(Array.isArray(berkas) ? berkas[0]?.size : null);

  let id;
  if (revisiDari) {
    const lama = await one("SELECT * FROM laporan WHERE id = ? AND siswa_id = ?", [
      revisiDari,
      user.siswa_id,
    ]);
    if (!lama) {
      return NextResponse.json({ error: "Laporan asal tidak ditemukan" }, { status: 404 });
    }
    id = revisiDari;
    for (const lamaBerkas of await listBerkas({ laporanId: id })) {
      await hapusBerkas(lamaBerkas.id, user.siswa_id);
    }
    await run(
      `UPDATE laporan SET versi = versi + 1, status = 'terkirim', ukuran = ?, jawaban = ?, updated_at = NOW() WHERE id = ?`,
      [ukuranBaru ?? lama.ukuran, catatanJawaban || null, id]
    );
  } else {
    id = newId();
    await run(
      `INSERT INTO laporan (id, siswa_id, judul, versi, status, ukuran, halaman)
       VALUES (?,?,?,1,'terkirim',?,NULL)`,
      [id, user.siswa_id, judul.trim(), ukuranBaru]
    );
  }

  for (const b of milikSaya) {
    await run("UPDATE berkas SET laporan_id = ? WHERE id = ?", [id, b.id]);
  }

  const laporanBaru = await one("SELECT * FROM laporan WHERE id = ?", [id]);
  await catatRiwayatLaporan(id, {
    aksi: revisiDari ? "revisi" : "kirim",
    oleh: user.nama,
    peran: "siswa",
    catatan: revisiDari ? catatanJawaban || null : null,
    versi: laporanBaru?.versi ?? 1,
  });
  await beritahuLaporanBaru(laporanBaru, { revisi: Boolean(revisiDari) });

  const laporan = serializeLaporan(laporanBaru);
  laporan.berkas = (await listBerkas({ laporanId: id })).map(serializeBerkas);
  return NextResponse.json({ ok: true, laporan }, { status: 201 });
}
