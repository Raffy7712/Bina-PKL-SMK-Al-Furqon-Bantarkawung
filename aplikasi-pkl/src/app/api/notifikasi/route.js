import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { serializeNotifikasi } from "@/lib/serialize";

const MAKS = 30;

export async function GET() {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const notifikasi = (
    await all(
      `SELECT * FROM notifikasi WHERE user_id = ? ORDER BY dibuat DESC, seq DESC LIMIT ?`,
      [user.id, MAKS]
    )
  ).map(serializeNotifikasi);

  const belum = await one(
    "SELECT COUNT(*) AS n FROM notifikasi WHERE user_id = ? AND dibaca = 0",
    [user.id]
  );

  return NextResponse.json({ notifikasi, belumDibaca: belum?.n ?? 0 });
}
