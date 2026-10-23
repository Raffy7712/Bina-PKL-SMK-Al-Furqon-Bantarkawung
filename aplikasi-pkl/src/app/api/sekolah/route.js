import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all, hashPassword, newId, run } from "@/lib/db";
import { cekFormatEmail, cekSandi, pemakaiEmail } from "@/lib/akun";

const bentuk = (r) => ({
  id: r.id,
  nama: r.nama,
  email: r.email,
  googleEmail: r.google_email ?? null,
  dibuat: r.created_at ?? null,
});

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  const rows = await all(
    `SELECT id, nama, email, google_email, created_at
     FROM users WHERE role = 'sekolah' ORDER BY nama`
  );
  return NextResponse.json({ sekolah: rows.map(bentuk) });
}

export async function POST(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const nama = String(body.nama ?? "").trim();
  if (!nama) {
    return NextResponse.json({ error: "Nama pembimbing wajib diisi." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();

  let galat = cekFormatEmail(email);
  if (galat) return NextResponse.json({ error: galat }, { status: 400 });
  const pemakai = await pemakaiEmail(email);
  if (pemakai) {
    return NextResponse.json(
      { error: `Email sudah dipakai akun lain (${pemakai.nama}).` },
      { status: 409 }
    );
  }
  galat = cekSandi(body.sandi, { wajib: true });
  if (galat) return NextResponse.json({ error: galat }, { status: 400 });

  const id = newId();
  await run(
    "INSERT INTO users (id, nama, email, password, role) VALUES (?,?,?,?,?)",
    [id, nama, email, hashPassword(String(body.sandi)), "sekolah"]
  );

  return NextResponse.json(
    { ok: true, akun: { id, nama, email, googleEmail: null } },
    { status: 201 }
  );
}
