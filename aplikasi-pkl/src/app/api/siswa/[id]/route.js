import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db, run, one, hashPassword, transaksi } from "@/lib/db";
import { serializeSiswa } from "@/lib/serialize";
import { bersihkanTelepon } from "@/lib/wa";

const STATUS_SISWA = ["aktif", "nonaktif"];

export async function PATCH(request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const siswa = await one("SELECT * FROM siswa WHERE id = ?", [id]);
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const patch = {};
  if (body.nama !== undefined) {
    const nama = String(body.nama).trim();
    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    patch.nama = nama;
  }
  if (body.kelas !== undefined) {
    const kelas = String(body.kelas).trim();
    if (
      kelas &&
      kelas !== "Belum ditentukan" &&
      !await one("SELECT id FROM kelas WHERE nama = ?", [kelas])
    ) {
      return NextResponse.json(
        { error: `Kelas "${kelas}" belum terdaftar, tambahkan dulu di halaman Kelas.` },
        { status: 400 }
      );
    }
    patch.kelas = kelas || "Belum ditentukan";
  }
  if (body.status !== undefined) {
    if (!STATUS_SISWA.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak dikenal" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.telepon !== undefined) {
    const telp = bersihkanTelepon(body.telepon);
    if (!telp.ok) {
      return NextResponse.json({ error: telp.error }, { status: 400 });
    }
    patch.telepon = telp.nilai;
  }
  if (body.dudiId !== undefined) {
    if (body.dudiId === null || body.dudiId === "") {
      patch.dudi_id = null;
    } else {
      const d = await one("SELECT id FROM dudi WHERE id = ?", [body.dudiId]);
      if (!d) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 400 });
      patch.dudi_id = body.dudiId;
    }
  }
  const resetSandi = body.resetSandi === true;

  const kolom = Object.keys(patch);
  if (kolom.length === 0 && !resetSandi) {
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  }

  if (kolom.length) {
    await run(
      `UPDATE siswa SET ${kolom.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
      [...kolom.map((k) => patch[k]), id]
    );
  }
  if (patch.nama !== undefined) {
    await run("UPDATE users SET nama = ? WHERE siswa_id = ?", [patch.nama, id]);
  }
  if (resetSandi) {
    await run("UPDATE users SET password = ? WHERE siswa_id = ?", [hashPassword(siswa.nis), id]);
  }

  const row = await one(
    `SELECT s.*, d.nama AS dudi_nama FROM siswa s LEFT JOIN dudi d ON d.id = s.dudi_id WHERE s.id = ?`,
    [id]
  );
  return NextResponse.json({ ok: true, siswa: serializeSiswa(row), sandiDireset: resetSandi });
}

export async function DELETE(_request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const siswa = await one("SELECT id FROM siswa WHERE id = ?", [id]);
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  try {
    await transaksi(async (conn) => {
      await conn.execute("DELETE FROM checkin WHERE siswa_id = ?", [id]);
      await conn.execute("DELETE FROM jurnal WHERE siswa_id = ?", [id]);
      await conn.execute("DELETE FROM laporan WHERE siswa_id = ?", [id]);
      await conn.execute("DELETE FROM users WHERE siswa_id = ?", [id]);
      await conn.execute("DELETE FROM siswa WHERE id = ?", [id]);
    });
  } catch (e) {
    return NextResponse.json({ error: "Gagal menghapus siswa." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
