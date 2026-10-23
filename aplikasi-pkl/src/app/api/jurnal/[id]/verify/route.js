import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, one } from "@/lib/db";
import { getJurnal } from "@/lib/serialize";
import { beritahuVerifikasiDudi, beritahuVerifikasiSekolah } from "@/lib/notifikasi";

export async function POST(request, { params }) {
  const { user, error } = await requireRole("dudi", "sekolah");
  if (error) return error;

  const { id } = await params;
  const jurnal = await one("SELECT * FROM jurnal WHERE id = ?", [id]);
  if (!jurnal) {
    return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
  }

  if (user.role === "dudi" && jurnal.siswa_id) {
    const own = await one("SELECT id FROM siswa WHERE id = ? AND dudi_id = ?", [
      jurnal.siswa_id,
      user.dudi_id,
    ]);
    if (!own) {
      return NextResponse.json({ error: "Bukan siswa bimbinganmu" }, { status: 403 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { aksi, catatan } = body;
  const note = String(catatan ?? "").trim();

  if (!["terima", "tolak"].includes(aksi)) {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }

  if (user.role === "dudi") {
    if (jurnal.status !== "menunggu_dudi") {
      return NextResponse.json(
        { error: "Jurnal ini bukan antrean verifikasi DUDI" },
        { status: 409 }
      );
    }
    if (aksi === "tolak" && !note) {
      return NextResponse.json({ error: "Catatan penolakan wajib diisi" }, { status: 400 });
    }
    await run(
      `UPDATE jurnal SET status = ?, catatan_dudi = COALESCE(NULLIF(?, ''), catatan_dudi),
         verifikasi_dudi_at = NOW(), verifikasi_dudi_hasil = ?,
         verifikasi_dudi_oleh = ?
       WHERE id = ?`,
      [aksi === "terima" ? "menunggu_sekolah" : "ditolak", note, aksi, user.nama, id]
    );
    await beritahuVerifikasiDudi(jurnal, aksi === "terima", note);
  } else {
    if (jurnal.status !== "menunggu_sekolah") {
      return NextResponse.json(
        { error: "Jurnal ini bukan antrean verifikasi sekolah" },
        { status: 409 }
      );
    }
    if (aksi === "tolak" && !note) {
      return NextResponse.json({ error: "Catatan pengembalian wajib diisi" }, { status: 400 });
    }
    await run(
      `UPDATE jurnal SET status = ?, catatan_sekolah = COALESCE(NULLIF(?, ''), catatan_sekolah),
         verifikasi_sekolah_at = NOW(), verifikasi_sekolah_hasil = ?,
         verifikasi_sekolah_oleh = ?
       WHERE id = ?`,
      [aksi === "terima" ? "diterima" : "ditolak", note, aksi, user.nama, id]
    );
    await beritahuVerifikasiSekolah(jurnal, aksi === "terima", note);
  }

  return NextResponse.json({ ok: true, jurnal: await getJurnal(id) });
}
