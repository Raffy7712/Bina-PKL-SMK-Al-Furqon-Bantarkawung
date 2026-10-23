import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one, run } from "@/lib/db";
import {
  SEMUA_ROLE,
  cekFormatUsername,
  bertabrakanDenganLoginLain,
  pemakaiUsername,
} from "@/lib/akun";

export async function POST(request) {
  const { user, error } = await requireRole(...SEMUA_ROLE);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim().toLowerCase();

  if (!username) {
    await run("UPDATE users SET username = NULL WHERE id = ?", [user.id]);
    return NextResponse.json({ ok: true, username: null });
  }

  const galatFormat = cekFormatUsername(username);
  if (galatFormat) return NextResponse.json({ error: galatFormat }, { status: 400 });

  if (await pemakaiUsername(username, user.id)) {
    return NextResponse.json(
      { error: "Username sudah dipakai akun lain. Pilih yang lain." },
      { status: 409 }
    );
  }

  if (await bertabrakanDenganLoginLain(username, user.id)) {
    return NextResponse.json(
      { error: "Username tidak boleh sama dengan email atau NIS yang sudah terdaftar." },
      { status: 409 }
    );
  }

  try {
    await run("UPDATE users SET username = ? WHERE id = ?", [username, user.id]);
  } catch (galat) {
    if (galat?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Username sudah dipakai akun lain. Pilih yang lain." },
        { status: 409 }
      );
    }
    throw galat;
  }

  const cek = await one("SELECT username FROM users WHERE id = ?", [user.id]);
  return NextResponse.json({ ok: true, username: cek?.username ?? null });
}
