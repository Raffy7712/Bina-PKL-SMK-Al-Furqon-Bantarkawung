import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { serializeLaporan, listRiwayatLaporan } from "@/lib/serialize";
import { listBerkas, serializeBerkas } from "@/lib/berkas";

export async function GET(_request, { params }) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const { id } = await params;
  const row = await one(
    `SELECT l.*, s.nama AS siswa_nama, s.dudi_id AS siswa_dudi_id
     FROM laporan l JOIN siswa s ON s.id = l.siswa_id
     WHERE l.id = ?`,
    [id]
  );
  if (!row) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (user.role === "siswa" && row.siswa_id !== user.siswa_id) {
    return NextResponse.json(
      { error: "Tidak berhak melihat laporan ini" },
      { status: 403 }
    );
  }
  if (user.role === "dudi" && (!user.dudi_id || row.siswa_dudi_id !== user.dudi_id)) {
    return NextResponse.json(
      { error: "Tidak berhak melihat laporan ini" },
      { status: 403 }
    );
  }

  const laporan = serializeLaporan(row);
  laporan.berkas = (await listBerkas({ laporanId: id })).map(serializeBerkas);
  return NextResponse.json({
    laporan,
    riwayat: await listRiwayatLaporan(id),
  });
}
