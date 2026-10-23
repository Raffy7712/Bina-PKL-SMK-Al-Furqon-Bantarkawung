import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getJurnal } from "@/lib/serialize";
import { listBerkas, serializeBerkas } from "@/lib/berkas";

export async function GET(_request, { params }) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const { id } = await params;
  const row = await one(
    `SELECT j.*, s.nama AS siswa_nama, s.kelas AS siswa_kelas,
            s.nis AS siswa_nis, s.dudi_id AS siswa_dudi_id,
            d.nama AS dudi_nama
     FROM jurnal j
     JOIN siswa s ON s.id = j.siswa_id
     LEFT JOIN dudi d ON d.id = s.dudi_id
     WHERE j.id = ?`,
    [id]
  );
  if (!row) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
  }

  if (user.role === "siswa" && row.siswa_id !== user.siswa_id) {
    return NextResponse.json({ error: "Tidak berhak melihat jurnal ini" }, { status: 403 });
  }
  if (user.role === "dudi" && (!user.dudi_id || row.siswa_dudi_id !== user.dudi_id)) {
    return NextResponse.json({ error: "Tidak berhak melihat jurnal ini" }, { status: 403 });
  }

  const checkin = await one(
    `SELECT c.*, d.nama AS dudi_nama, d.radius_m
     FROM checkin c LEFT JOIN dudi d ON d.id = c.dudi_id
     WHERE c.siswa_id = ? AND date(c.created_at) = ?`,
    [row.siswa_id, row.tanggal]
  );

  const jurnal = await getJurnal(id);
  jurnal.berkas = (await listBerkas({ jurnalId: id })).map(serializeBerkas);
  return NextResponse.json({
    jurnal,
    siswa: {
      id: row.siswa_id,
      nis: row.siswa_nis,
      nama: row.siswa_nama,
      kelas: row.siswa_kelas,
      dudiNama: row.dudi_nama ?? null,
    },
    checkin: checkin ?? null,
  });
}
