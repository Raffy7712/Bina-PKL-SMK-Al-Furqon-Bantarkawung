import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, newId, one, hashPassword } from "@/lib/db";
import { listSiswa, statsSiswa, serializeSiswa } from "@/lib/serialize";
import { bersihkanTelepon } from "@/lib/wa";
import { emailSiswa } from "@/lib/domain";

const pad = (n) => String(n).padStart(2, "0");

export async function GET(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  let dudiId = params.get("dudiId") ?? undefined;

  const mauStats = params.get("stats") === "1";
  const tahun = Number.parseInt(params.get("tahun"), 10) || 2026;
  const bulan = Math.min(Math.max(Number.parseInt(params.get("bulan"), 10) || 10, 1), 12);
  const statsBulan = mauStats
    ? [
        `${tahun}-${pad(bulan)}-01`,
        bulan === 12 ? `${tahun + 1}-01-01` : `${tahun}-${pad(bulan + 1)}-01`,
      ]
    : null;

  if (user.role === "dudi") {
    if (!user.dudi_id) {
      return NextResponse.json(mauStats ? { siswa: [], stats: {} } : { siswa: [] });
    }
    dudiId = user.dudi_id;
  }

  if (user.role === "siswa") {
    const saya = await one("SELECT dudi_id FROM siswa WHERE id = ?", [user.siswa_id]);
    const rows = saya?.dudi_id
      ? await listSiswa({ dudiId: saya.dudi_id, statsBulan })
      : (await listSiswa({ statsBulan })).filter((s) => s.id === user.siswa_id);
    return NextResponse.json({
      siswa: rows.map((s) => ({
        ...s,
        telepon: undefined,
        akun: undefined,
        saya: s.id === user.siswa_id,
      })),
    });
  }

  const body = { siswa: await listSiswa({ dudiId, statsBulan }) };
  if (user.role !== "admin") {
    body.siswa = body.siswa.map((s) => ({ ...s, akun: undefined }));
  }
  if (mauStats) body.stats = await statsSiswa({ dudiId, statsBulan });
  return NextResponse.json(body);
}

export async function POST(request) {
  const { user, error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { nama, nis, kelas, dudiId, password, telepon } = body;
  if (!nama?.trim() || !nis?.trim()) {
    return NextResponse.json({ error: "Nama dan NIS wajib diisi" }, { status: 400 });
  }
  if (await one("SELECT id FROM siswa WHERE nis = ?", [String(nis).trim()])) {
    return NextResponse.json({ error: "NIS sudah terdaftar" }, { status: 409 });
  }
  const kelasBersih = String(kelas ?? "").trim();
  if (
    kelasBersih &&
    kelasBersih !== "Belum ditentukan" &&
    !await one("SELECT id FROM kelas WHERE nama = ?", [kelasBersih])
  ) {
    return NextResponse.json(
      { error: `Kelas "${kelasBersih}" belum terdaftar, tambahkan dulu di halaman Kelas.` },
      { status: 400 }
    );
  }
  const telp = bersihkanTelepon(telepon);
  if (!telp.ok) {
    return NextResponse.json({ error: telp.error }, { status: 400 });
  }

  const id = newId();
  await run("INSERT INTO siswa (id, nis, nama, kelas, telepon, status, dudi_id) VALUES (?,?,?,?,?,?,?)", [
    id,
    String(nis).trim(),
    nama.trim(),
    kelasBersih || "Belum ditentukan",
    telp.nilai,
    "aktif",
    dudiId || null,
  ]);

  const email = emailSiswa(nis);
  await run(
    "INSERT INTO users (id, nama, email, password, role, siswa_id) VALUES (?,?,?,?,?,?)",
    [newId(), nama.trim(), email, hashPassword(password || String(nis).trim()), "siswa", id]
  );

  return NextResponse.json(
    { ok: true, siswa: serializeSiswa(await one("SELECT * FROM siswa WHERE id = ?", [id])) },
    { status: 201 }
  );
}
