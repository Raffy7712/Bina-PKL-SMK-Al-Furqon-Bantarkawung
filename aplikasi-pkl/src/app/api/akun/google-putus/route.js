import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one, run } from "@/lib/db";

export async function POST(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const targetId = body.userId ? String(body.userId) : user.id;
  if (targetId !== user.id && user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang bisa memutuskan tautan akun orang lain." },
      { status: 403 }
    );
  }

  const target = await one("SELECT id, google_email FROM users WHERE id = ?", [targetId]);
  if (!target) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  await run("UPDATE users SET google_sub = NULL, google_email = NULL WHERE id = ?", [targetId]);
  return NextResponse.json({ ok: true, dihapus: target.google_email ?? null });
}
