import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { mimeFoto, pathFoto } from "@/lib/berkas";
import { readFileSync } from "node:fs";

export async function GET(request) {
  const { error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const id = new URL(request.url).searchParams.get("u");
  if (!id) return NextResponse.json({ error: "Parameter u wajib" }, { status: 400 });

  const baris = await one("SELECT foto FROM users WHERE id = ?", [id]);
  const penuh = pathFoto(baris?.foto);
  if (!penuh) return NextResponse.json({ error: "Foto tidak ada" }, { status: 404 });

  const isi = readFileSync(penuh);
  return new NextResponse(isi, {
    status: 200,
    headers: {
      "content-type": mimeFoto(baris.foto),
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=300",
      "content-length": String(isi.length),
    },
  });
}
