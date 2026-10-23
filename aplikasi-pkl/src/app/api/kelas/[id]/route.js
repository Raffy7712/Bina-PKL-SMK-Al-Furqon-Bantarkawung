import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db, one, run, transaksi } from "@/lib/db";

export async function PATCH(request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const lama = await one("SELECT id, nama FROM kelas WHERE id = ?", [id]);
  if (!lama) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

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
  if (
    await one("SELECT id FROM kelas WHERE nama = ? AND id <> ?", [nama, id])
  ) {
    return NextResponse.json({ error: `Kelas "${nama}" sudah ada` }, { status: 409 });
  }

  let dipindah = 0;
  try {
    await transaksi(async (conn) => {
      await conn.execute("UPDATE kelas SET nama = ? WHERE id = ?", [nama, id]);
      const [r] = await conn.execute(
        "UPDATE siswa SET kelas = ? WHERE lower(trim(kelas)) = lower(?)",
        [nama, lama.nama]
      );
      dipindah = r.affectedRows ?? 0;
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah kelas." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, kelas: { id, nama }, dipindah });
}

export async function DELETE(_request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const kelas = await one("SELECT id, nama FROM kelas WHERE id = ?", [id]);
  if (!kelas) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  const { n } = await one(
    "SELECT COUNT(*) AS n FROM siswa WHERE lower(trim(kelas)) = lower(?)",
    [kelas.nama]
  );
  if (n > 0) {
    return NextResponse.json(
      {
        error: `Tidak bisa dihapus, masih ada ${n} siswa di kelas "${kelas.nama}". Pindahkan mereka dulu.`,
        jumlah: n,
      },
      { status: 409 }
    );
  }

  await run("DELETE FROM kelas WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
