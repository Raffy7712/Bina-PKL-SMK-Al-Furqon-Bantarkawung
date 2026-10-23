import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { SEMUA_ROLE } from "@/lib/akun";
import {
  MAKS_FOTO,
  hapusFoto,
  mimeFoto,
  pathFoto,
  simpanFoto,
} from "@/lib/berkas";
import { readFileSync } from "node:fs";

export async function GET() {
  const { user, error } = await requireRole(...SEMUA_ROLE);
  if (error) return error;

  const baris = await one("SELECT foto FROM users WHERE id = ?", [user.id]);
  const penuh = pathFoto(baris?.foto);
  if (!penuh) {
    return NextResponse.json({ error: "Foto belum ada" }, { status: 404 });
  }

  const isi = readFileSync(penuh);
  return new NextResponse(isi, {
    status: 200,
    headers: {
      "content-type": mimeFoto(baris.foto),
      "cache-control": "private, no-cache",
      "content-length": String(isi.length),
    },
  });
}

export async function POST(request) {
  const { user, error } = await requireRole(...SEMUA_ROLE);
  if (error) return error;

  const panjang = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(panjang) && panjang > MAKS_FOTO + 512 * 1024) {
    return NextResponse.json({ error: "Ukuran foto maksimal 2 MB" }, { status: 413 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Unggahan tidak valid" }, { status: 400 });
  }

  const berkas = form.get("foto");
  if (!berkas || typeof berkas === "string") {
    return NextResponse.json({ error: "Tidak ada foto yang dikirim" }, { status: 400 });
  }
  if (berkas.size > MAKS_FOTO) {
    return NextResponse.json({ error: "Ukuran foto maksimal 2 MB" }, { status: 413 });
  }

  const buf = Buffer.from(await berkas.arrayBuffer());
  const hasil = simpanFoto({ nama: berkas.name, ukuran: berkas.size, buf });
  if (hasil.galat) {
    return NextResponse.json({ error: hasil.galat }, { status: 415 });
  }

  const lama = await one("SELECT foto FROM users WHERE id = ?", [user.id]);
  await run("UPDATE users SET foto = ? WHERE id = ?", [hasil.file, user.id]);
  if (lama?.foto) hapusFoto(lama.foto);

  return NextResponse.json({ ok: true, foto: hasil.file }, { status: 201 });
}

export async function DELETE() {
  const { user, error } = await requireRole(...SEMUA_ROLE);
  if (error) return error;

  const lama = await one("SELECT foto FROM users WHERE id = ?", [user.id]);
  await run("UPDATE users SET foto = NULL WHERE id = ?", [user.id]);
  if (lama?.foto) hapusFoto(lama.foto);

  return NextResponse.json({ ok: true });
}
