import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, newId, one, all } from "@/lib/db";
import { jarakMeter, AKURASI_MAKS_M, RADIUS_BAWAAN_M } from "@/lib/jarak";

export async function GET() {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  const rows = await all(
    `SELECT c.*, d.nama AS dudi_nama, d.radius_m FROM checkin c
     LEFT JOIN dudi d ON d.id = c.dudi_id
     WHERE c.siswa_id = ? AND date(c.created_at) = CURDATE()
     ORDER BY c.created_at DESC`,
    [user.siswa_id]
  );
  return NextResponse.json({ checkin: rows });
}

export async function POST(request) {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  let body = {};
  try {
    body = await request.json();
  } catch {
  }

  const siswa = await one(
    `SELECT s.dudi_id, d.nama AS dudi_nama, d.lat, d.lng, d.radius_m
     FROM siswa s LEFT JOIN dudi d ON d.id = s.dudi_id
     WHERE s.id = ?`,
    [user.siswa_id]
  );
  if (!siswa?.dudi_id) {
    return NextResponse.json(
      { error: "Akun ini belum memiliki tempat PKL" },
      { status: 400 }
    );
  }
  if (siswa.lat == null || siswa.lng == null) {
    return NextResponse.json(
      { error: "Titik lokasi tempat PKL belum diatur admin. Hubungi admin sekolah." },
      { status: 400 }
    );
  }

  const sudah = await one(
    `SELECT id FROM checkin WHERE siswa_id = ? AND date(created_at) = CURDATE()`,
    [user.siswa_id]
  );
  if (sudah) {
    return NextResponse.json(
      { error: "Kamu sudah check-in hari ini" },
      { status: 409 }
    );
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Lokasi GPS wajib aktif untuk check-in" },
      { status: 400 }
    );
  }

  const radius =
    Number.isFinite(Number(siswa.radius_m)) && Number(siswa.radius_m) > 0
      ? Number(siswa.radius_m)
      : RADIUS_BAWAAN_M;
  const jarak = jarakMeter({ lat, lng }, { lat: siswa.lat, lng: siswa.lng });
  if (jarak == null) {
    return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  }
  if (jarak > radius) {
    return NextResponse.json(
      {
        error: `Kamu berada ${jarak} m dari ${siswa.dudi_nama}, di luar radius ${radius} m.`,
        jarak,
        radius,
      },
      { status: 422 }
    );
  }

  const akurasi = Number.isFinite(Number(body.akurasi))
    ? Math.round(Number(body.akurasi))
    : null;
  if (akurasi != null && akurasi > AKURASI_MAKS_M) {
    return NextResponse.json(
      {
        error: `Akurasi GPS terlalu rendah (±${akurasi} m). Coba di tempat terbuka.`,
        akurasi,
      },
      { status: 422 }
    );
  }

  const id = newId();
  await run(
    `INSERT INTO checkin (id, siswa_id, dudi_id, lat, lng, jarak_m, akurasi_m, source)
     VALUES (?,?,?,?,?,?,?, 'gps')`,
    [id, user.siswa_id, siswa.dudi_id, lat, lng, jarak, akurasi]
  );

  return NextResponse.json(
    { ok: true, checkin: await one("SELECT * FROM checkin WHERE id = ?", [id]) },
    { status: 201 }
  );
}

export async function DELETE() {
  const { user, error } = await requireRole("siswa");
  if (error) return error;

  const res = await run(
    `DELETE FROM checkin WHERE siswa_id = ? AND date(created_at) = CURDATE()`,
    [user.siswa_id]
  );
  return NextResponse.json({ ok: true, deleted: res.changes });
}
