import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getBerkas, pathBerkas, TIPE_DIIZINKAN } from "@/lib/berkas";

export async function GET(_request, { params }) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const { id } = await params;
  const row = await getBerkas(id);
  if (!row) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
  }

  if (user.role === "siswa" && row.siswa_id !== user.siswa_id) {
    return NextResponse.json({ error: "Tidak berhak mengunduh berkas ini" }, { status: 403 });
  }
  if (user.role === "dudi") {
    const own = await one("SELECT id FROM siswa WHERE id = ? AND dudi_id = ?", [
      row.siswa_id,
      user.dudi_id,
    ]);
    if (!own) {
      return NextResponse.json(
        { error: "Tidak berhak mengunduh berkas ini" },
        { status: 403 }
      );
    }
  }

  const full = pathBerkas(row);
  if (!full) {
    return NextResponse.json(
      { error: "Isi berkas tidak ditemukan di server" },
      { status: 410 }
    );
  }

  const ext = String(row.path).split(".").pop()?.toLowerCase();
  const mime = TIPE_DIIZINKAN[ext] ?? "application/octet-stream";
  const isi = readFileSync(full);
  const nama = String(row.nama ?? `berkas.${ext}`).replace(/["\\\r\n]/g, "_");

  return new NextResponse(isi, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(isi.length),
      "Content-Disposition": `attachment; filename="${nama}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
