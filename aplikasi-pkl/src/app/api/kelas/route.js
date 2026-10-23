import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all, one, run, newId } from "@/lib/db";

export async function GET() {
  const { error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const kelas = (
    await all(
      `SELECT k.id, k.nama, COUNT(s.id) AS jml_siswa
         FROM kelas k
         LEFT JOIN siswa s ON lower(trim(s.kelas)) = lower(k.nama)
        GROUP BY k.id, k.nama
        ORDER BY k.nama`
    )
  ).map((k) => ({ id: k.id, nama: k.nama, jmlSiswa: Number(k.jml_siswa) }));

  return NextResponse.json({ kelas });
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

  const nama = String(body?.nama ?? "").trim();
  if (!nama) {
    return NextResponse.json({ error: "Nama kelas wajib diisi" }, { status: 400 });
  }
  if (nama.length > 40) {
    return NextResponse.json(
      { error: "Nama kelas maksimal 40 karakter" },
      { status: 400 }
    );
  }
  if (await one("SELECT id FROM kelas WHERE nama = ?", [nama])) {
    return NextResponse.json({ error: `Kelas "${nama}" sudah ada` }, { status: 409 });
  }

  const id = newId();
  await run("INSERT INTO kelas (id, nama) VALUES (?, ?)", [id, nama]);
  return NextResponse.json(
    { ok: true, kelas: { id, nama, jmlSiswa: 0 } },
    { status: 201 }
  );
}
