import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import {
  MAKS_BERKAS_PER_KIRIM,
  MAKS_UKURAN,
  periksaBerkas,
  simpanBerkas,
  serializeBerkas,
  hapusBerkas,
} from "@/lib/berkas";

export async function POST(request) {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  const panjang = Number(request.headers.get("content-length") ?? 0);
  const batasBody = MAKS_UKURAN * MAKS_BERKAS_PER_KIRIM + 1024 * 1024;
  if (Number.isFinite(panjang) && panjang > batasBody) {
    return NextResponse.json(
      { error: `Total unggahan melebihi ${Math.round(batasBody / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Unggahan tidak valid" }, { status: 400 });
  }

  const daftar = form.getAll("file").filter((f) => typeof f !== "string");
  if (daftar.length === 0) {
    return NextResponse.json({ error: "Tidak ada berkas" }, { status: 400 });
  }
  if (daftar.length > MAKS_BERKAS_PER_KIRIM) {
    return NextResponse.json(
      { error: `Maksimal ${MAKS_BERKAS_PER_KIRIM} berkas sekali kirim` },
      { status: 400 }
    );
  }

  const tersimpan = [];
  for (const file of daftar) {
    if (file.size > MAKS_UKURAN) {
      return NextResponse.json(
        { error: `"${file.name}" melebihi 10 MB` },
        { status: 413 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const tolak = periksaBerkas({ nama: file.name, ukuran: file.size, buf });
    if (tolak) {
      return NextResponse.json({ error: `${file.name}: ${tolak}` }, { status: 415 });
    }
    tersimpan.push(
      await simpanBerkas({
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        buf,
        siswaId: user.siswa_id,
      })
    );
  }

  return NextResponse.json(
    { ok: true, berkas: tersimpan.map(serializeBerkas) },
    { status: 201 }
  );
}

export async function DELETE(request) {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const row = await one("SELECT * FROM berkas WHERE id = ? AND siswa_id = ?", [
    id,
    user.siswa_id,
  ]);
  if (!row) return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
  if (row.jurnal_id || row.laporan_id) {
    return NextResponse.json(
      { error: "Berkas sudah terkirim dan tidak bisa dihapus" },
      { status: 409 }
    );
  }
  await hapusBerkas(id, user.siswa_id);
  return NextResponse.json({ ok: true });
}
