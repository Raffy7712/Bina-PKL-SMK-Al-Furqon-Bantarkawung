import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hashPassword, one, run } from "@/lib/db";
import { cekFormatEmail, cekSandi, pemakaiEmail } from "@/lib/akun";

export async function PATCH(request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const akun = await one("SELECT * FROM users WHERE id = ? AND role = 'sekolah'", [id]);
  if (!akun) {
    return NextResponse.json({ error: "Akun pembimbing tidak ditemukan" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const nama = body.nama !== undefined ? String(body.nama).trim() : akun.nama;
  if (!nama) {
    return NextResponse.json({ error: "Nama pembimbing wajib diisi." }, { status: 400 });
  }

  const email =
    body.email !== undefined ? String(body.email).trim() : akun.email;
  if (email.toLowerCase() !== String(akun.email).toLowerCase()) {
    const galat = cekFormatEmail(email);
    if (galat) return NextResponse.json({ error: galat }, { status: 400 });
    const pemakai = await pemakaiEmail(email, id);
    if (pemakai) {
      return NextResponse.json(
        { error: `Email sudah dipakai akun lain (${pemakai.nama}).` },
        { status: 409 }
      );
    }
  }

  const sandi = body.sandi !== undefined ? String(body.sandi) : "";
  const galatSandi = cekSandi(sandi, { wajib: false });
  if (galatSandi) return NextResponse.json({ error: galatSandi }, { status: 400 });

  await run("UPDATE users SET nama = ?, email = ? WHERE id = ?", [nama, email, id]);
  if (sandi) {
    await run("UPDATE users SET password = ? WHERE id = ?", [hashPassword(sandi), id]);
  }

  const baru = await one("SELECT id, nama, email, google_email FROM users WHERE id = ?", [id]);
  return NextResponse.json({
    ok: true,
    akun: {
      id: baru.id,
      nama: baru.nama,
      email: baru.email,
      googleEmail: baru.google_email ?? null,
    },
  });
}

export async function DELETE(_request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const akun = await one("SELECT id, nama FROM users WHERE id = ? AND role = 'sekolah'", [id]);
  if (!akun) {
    return NextResponse.json({ error: "Akun pembimbing tidak ditemukan" }, { status: 404 });
  }

  const { n } = await one("SELECT COUNT(*) AS n FROM users WHERE role = 'sekolah'");
  if (n <= 1) {
    return NextResponse.json(
      {
        error:
          "Ini satu-satunya akun pembimbing sekolah. Tambahkan akun pengganti dulu agar verifikasi jurnal tetap berjalan.",
      },
      { status: 409 }
    );
  }

  await run("DELETE FROM users WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
