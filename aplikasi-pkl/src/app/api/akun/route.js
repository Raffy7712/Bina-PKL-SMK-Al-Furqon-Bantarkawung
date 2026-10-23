import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { googleSiap } from "@/lib/google";

export async function GET() {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const u = await one(
    "SELECT id, nama, email, username, foto, role, siswa_id, dudi_id, google_email FROM users WHERE id = ?",
    [user.id]
  );
  if (!u) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

  let nis = null;
  let kelas = null;
  if (u.role === "siswa") {
    const s = await one("SELECT nis, kelas FROM siswa WHERE id = ?", [u.siswa_id]);
    nis = s?.nis ?? null;
    kelas = s?.kelas ?? null;
  }
  let dudiNama = null;
  if (u.role === "dudi") {
    dudiNama = (await one("SELECT nama FROM dudi WHERE id = ?", [u.dudi_id]))?.nama ?? null;
  }

  return NextResponse.json({
    akun: {
      id: u.id,
      nama: u.nama,
      email: u.email,
      username: u.username ?? null,
      fotoUrl: u.foto ? `/api/akun/foto?v=${encodeURIComponent(u.foto)}` : null,
      role: u.role,
      nis,
      kelas,
      dudiNama,
      googleEmail: u.google_email ?? null,
      googleAktif: await googleSiap(),
    },
  });
}
