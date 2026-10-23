import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  bacaHasilPengingat,
  bacaPengaturanPengingat,
  isoLokal,
  jalankanPengingatOtomatis,
  simpanPengaturanPengingat,
} from "@/lib/pengingat";

async function keadaan() {
  const sekarang = new Date();
  return {
    pengaturan: await bacaPengaturanPengingat(),
    terakhir: await bacaHasilPengingat(),
    server: {
      tanggal: isoLokal(sekarang),
      jam: sekarang.getHours(),
      hari: sekarang.getDay(),
    },
  };
}

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;
  return NextResponse.json(await keadaan());
}

export async function PATCH(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const patch = {};

  if (body.aktif !== undefined) patch.aktif = Boolean(body.aktif);

  if (body.jam !== undefined) {
    const jam = Number.parseInt(body.jam, 10);
    if (!Number.isInteger(jam) || jam < 0 || jam > 23) {
      return NextResponse.json({ error: "Jam harus 0–23." }, { status: 400 });
    }
    patch.jam = jam;
  }

  if (body.hari !== undefined) {
    const hari = [...new Set(Array.isArray(body.hari) ? body.hari : [])]
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      .sort((a, b) => a - b);
    if (!hari.length) {
      return NextResponse.json(
        { error: "Pilih minimal satu hari pengingat." },
        { status: 400 }
      );
    }
    patch.hari = hari;
  }

  await simpanPengaturanPengingat(patch);
  return NextResponse.json({ ok: true, ...(await keadaan()) });
}

export async function POST(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body.jalankan) {
    return NextResponse.json({ error: "Body: { jalankan: true }" }, { status: 400 });
  }

  const hasil = await jalankanPengingatOtomatis({ abaikanJadwal: true });
  return NextResponse.json({ ok: true, hasil, ...(await keadaan()) });
}
