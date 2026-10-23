import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hashPassword, one, run, verifyPassword } from "@/lib/db";
import { cekSandi } from "@/lib/akun";

export async function POST(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const u = await one("SELECT * FROM users WHERE id = ?", [user.id]);
  if (!u) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

  const lama = String(body.lama ?? "");
  if (!verifyPassword(lama, u.password)) {
    return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 400 });
  }

  const baru = String(body.baru ?? "");
  const galat = cekSandi(baru, { wajib: true });
  if (galat) return NextResponse.json({ error: galat }, { status: 400 });
  if (baru === lama) {
    return NextResponse.json(
      { error: "Kata sandi baru masih sama dengan yang lama." },
      { status: 400 }
    );
  }

  await run("UPDATE users SET password = ? WHERE id = ?", [hashPassword(baru), user.id]);
  return NextResponse.json({ ok: true });
}
