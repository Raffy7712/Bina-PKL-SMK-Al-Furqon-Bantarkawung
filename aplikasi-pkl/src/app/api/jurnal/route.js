import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, newId, one } from "@/lib/db";
import { listJurnal, countJurnal, serializeJurnal, STATUS_VALID } from "@/lib/serialize";
import { beritahuJurnalBaru } from "@/lib/notifikasi";
import { getBerkas, serializeBerkas, petaBerkas } from "@/lib/berkas";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

export async function GET(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  let siswaId = params.get("siswaId") ?? undefined;
  let dudiId = undefined;

  if (user.role === "siswa") siswaId = user.siswa_id;
  if (user.role === "dudi") {
    if (!user.dudi_id) {
      return NextResponse.json({ jurnal: [], total: 0, limit: null, offset: 0 });
    }
    dudiId = user.dudi_id;
    if (siswaId) {
      const own = await one("SELECT id FROM siswa WHERE id = ? AND dudi_id = ?", [siswaId, user.dudi_id]);
      if (!own) return NextResponse.json({ error: "Bukan siswa bimbinganmu" }, { status: 403 });
    }
  }

  const statusRaw = params.get("status");
  const status = statusRaw
    ? statusRaw.split(",").map((s) => s.trim()).filter((s) => STATUS_VALID.includes(s))
    : undefined;
  if (statusRaw && status.length === 0) {
    return NextResponse.json({ jurnal: [], total: 0, limit: null, offset: 0 });
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/;
  const tanggal = isoDate.test(params.get("tanggal") ?? "") ? params.get("tanggal") : undefined;
  let sejak = isoDate.test(params.get("sejak") ?? "") ? params.get("sejak") : undefined;
  let sampai = isoDate.test(params.get("sampai") ?? "") ? params.get("sampai") : undefined;
  if (month.test(params.get("bulan") ?? "")) {
    const [y, m] = params.get("bulan").split("-").map(Number);
    const akhir = new Date(y, m, 0).getDate();
    sejak = `${y}-${String(m).padStart(2, "0")}-01`;
    sampai = `${y}-${String(m).padStart(2, "0")}-${String(akhir).padStart(2, "0")}`;
  }

  const semua = params.get("semua") === "1";
  const limit = semua
    ? undefined
    : Math.min(Math.max(parseInt(params.get("limit"), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(params.get("offset"), 10) || 0, 0);

  const filters = { siswaId, dudiId, status, tanggal, sejak, sampai };
  const total = await countJurnal(filters);
  const jurnal = await listJurnal({ ...filters, limit, offset });
  const peta = await petaBerkas(jurnal.map((j) => j.id));
  for (const j of jurnal) j.berkas = peta[j.id] ?? [];
  return NextResponse.json({ jurnal, total, limit: limit ?? null, offset });
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

  const { judul, kegiatan, tanggal, masuk, keluar, lampiran, berkasIds } = body;
  if (!judul?.trim()) {
    return NextResponse.json({ error: "Judul kegiatan wajib diisi" }, { status: 400 });
  }
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }

  const ids = Array.isArray(berkasIds) ? berkasIds.filter(Boolean) : [];
  const milikSaya = (
    await Promise.all(ids.map((bid) => getBerkas(bid)))
  ).filter((b) => b && b.siswa_id === user.siswa_id && !b.jurnal_id && !b.laporan_id);

  const namaLampiran = milikSaya.length
    ? milikSaya.map((b) => b.nama)
    : Array.isArray(lampiran)
      ? lampiran
      : String(lampiran ?? "").split(",").map((x) => x.trim()).filter(Boolean);

  const id = newId();
  await run(
    `INSERT INTO jurnal (id, siswa_id, tanggal, masuk, keluar, judul, kegiatan, lampiran, status)
     VALUES (?,?,?,?,?,?,?,?, 'menunggu_dudi')`,
    [
      id,
      user.siswa_id,
      tanggal,
      masuk || null,
      keluar || null,
      judul.trim(),
      kegiatan?.trim() || "",
      namaLampiran.join(", "),
    ]
  );
  for (const b of milikSaya) {
    await run("UPDATE berkas SET jurnal_id = ? WHERE id = ?", [id, b.id]);
  }

  const row = await one("SELECT * FROM jurnal WHERE id = ?", [id]);
  await beritahuJurnalBaru(row);
  const jurnal = serializeJurnal(row);
  jurnal.berkas = milikSaya.map(serializeBerkas);
  return NextResponse.json({ ok: true, jurnal }, { status: 201 });
}
