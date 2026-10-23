import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, one } from "@/lib/db";

export async function POST(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.semua === true) {
    await run("UPDATE notifikasi SET dibaca = 1 WHERE user_id = ? AND dibaca = 0", [user.id]);
  } else if (body.id) {
    await run("UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?", [
      String(body.id),
      user.id,
    ]);
  } else {
    return NextResponse.json({ error: "Tidak ada notifikasi yang ditandai" }, { status: 400 });
  }

  const belum = await one(
    "SELECT COUNT(*) AS n FROM notifikasi WHERE user_id = ? AND dibaca = 0",
    [user.id]
  );
  return NextResponse.json({ ok: true, belumDibaca: belum?.n ?? 0 });
}
