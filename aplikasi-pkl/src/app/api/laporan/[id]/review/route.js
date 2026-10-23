import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, one } from "@/lib/db";
import { serializeLaporan, catatRiwayatLaporan } from "@/lib/serialize";
import { normalisasiPenilaian } from "@/lib/nilai";
import { beritahuReviewLaporan } from "@/lib/notifikasi";

export async function POST(request, { params }) {
  const { user, error } = await requireRole("sekolah", "admin");
  if (error) return error;

  const { id } = await params;
  const laporan = await one("SELECT * FROM laporan WHERE id = ?", [id]);
  if (!laporan) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { aksi, catatan, penilaian } = body;
  const note = String(catatan ?? "").trim();

  let rubrik = null;
  if (aksi === "terima") {
    const hasil = normalisasiPenilaian(penilaian);
    if (hasil.error) {
      return NextResponse.json({ error: hasil.error }, { status: 400 });
    }
    rubrik = hasil.nilai;
  }

  if (aksi === "terima") {
    await run(
      `UPDATE laporan SET status = 'diterima', feedback = ?, penilaian = ?,
         updated_at = NOW() WHERE id = ?`,
      [note, rubrik ? JSON.stringify(rubrik) : null, id]
    );
  } else if (aksi === "revisi") {
    if (!note) {
      return NextResponse.json(
        { error: "Catatan revisi wajib diisi" },
        { status: 400 }
      );
    }
    await run(
      `UPDATE laporan SET status = 'revisi', feedback = ?, penilaian = NULL,
         updated_at = NOW() WHERE id = ?`,
      [note, id]
    );
  } else {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }

  const laporanBaru = await one("SELECT * FROM laporan WHERE id = ?", [id]);
  await catatRiwayatLaporan(id, {
    aksi,
    oleh: user.nama,
    peran: user.role,
    catatan: note || null,
    versi: laporanBaru?.versi ?? laporan.versi,
  });
  await beritahuReviewLaporan(laporanBaru, aksi === "terima", note);

  return NextResponse.json({ ok: true, laporan: serializeLaporan(laporanBaru) });
}
