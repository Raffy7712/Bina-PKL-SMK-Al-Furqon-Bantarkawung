import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { run, newId, one, hashPassword } from "@/lib/db";
import { listDudi } from "@/lib/serialize";
import { cekFormatEmail, cekSandi, pemakaiEmail } from "@/lib/akun";
import { resolveLocation, mapsLinkFromCoords } from "@/lib/geocode";
import { radiusValid, RADIUS_BAWAAN_M } from "@/lib/jarak";

function publik(dudi, role) {
  if (!dudi || role === "admin") return dudi;
  const { akun, ...sisa } = dudi;
  return sisa;
}

export async function GET(request) {
  const { user, error } = await requireRole("siswa", "dudi", "sekolah", "admin");
  if (error) return error;

  const params = new URL(request.url).searchParams;

  if (params.get("mine")) {
    let dudiId = user.dudi_id;
    if (user.role === "siswa") {
      dudiId = (await one("SELECT dudi_id FROM siswa WHERE id = ?", [user.siswa_id]))?.dudi_id;
    }
    if (!dudiId) {
      return NextResponse.json({ dudi: null });
    }
    return NextResponse.json({
      dudi: publik((await listDudi({ id: dudiId }))[0] ?? null, user.role),
    });
  }

  const id = params.get("id");
  if (id) {
    return NextResponse.json({
      dudi: publik((await listDudi({ id }))[0] ?? null, user.role),
    });
  }
  return NextResponse.json({ dudi: (await listDudi()).map((d) => publik(d, user.role)) });
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

  const { nama, bidang, alamat, kota, pembimbing, kontak, jam, mapsUrl, lokasi, radiusM } = body;
  if (!nama?.trim()) {
    return NextResponse.json({ error: "Nama mitra wajib diisi" }, { status: 400 });
  }

  const emailAkun = String(body.email ?? "").trim();
  const sandiAkun = String(body.sandi ?? "");
  if (emailAkun || sandiAkun) {
    if (!emailAkun) {
      return NextResponse.json(
        { error: "Isi email akun pembimbing juga." },
        { status: 400 }
      );
    }
    const galatEmail = cekFormatEmail(emailAkun);
    if (galatEmail) return NextResponse.json({ error: galatEmail }, { status: 400 });
    const pemakai = await pemakaiEmail(emailAkun);
    if (pemakai) {
      return NextResponse.json(
        { error: `Email sudah dipakai akun lain (${pemakai.nama}).` },
        { status: 409 }
      );
    }
    const galatSandi = cekSandi(sandiAkun, { wajib: true });
    if (galatSandi) return NextResponse.json({ error: galatSandi }, { status: 400 });
  }

  let lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  let lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;
  let label = null;
  if (radiusM !== undefined && radiusValid(radiusM) == null) {
    return NextResponse.json(
      { error: "Radius check-in harus 10 sampai 5000 meter" },
      { status: 400 }
    );
  }

  const sumber = String(mapsUrl || lokasi || "").trim();
  if ((lat == null || lng == null) && sumber) {
    try {
      const loc = await resolveLocation(sumber);
      lat = loc.lat;
      lng = loc.lng;
      label = loc.label;
    } catch (e) {
      return NextResponse.json(
        { error: `Lokasi tidak terbaca: ${e.message}` },
        { status: 422 }
      );
    }
  }

  const id = newId();
  const tones = ["bg-marine", "bg-candy", "bg-tang", "bg-mint", "bg-grape", "bg-sun"];
  await run(
    `INSERT INTO dudi (id, nama, bidang, alamat, kota, maps_url, lat, lng, pembimbing, kontak, jam, radius_m, tone)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      nama.trim(),
      bidang?.trim() || "",
      alamat?.trim() || label || "",
      kota?.trim() || "",
      mapsUrl?.trim() || mapsLinkFromCoords(lat, lng),
      lat,
      lng,
      pembimbing?.trim() || "",
      kontak?.trim() || "",
      jam?.trim() || "",
      radiusValid(radiusM) ?? RADIUS_BAWAAN_M,
      tones[Math.floor(Math.random() * tones.length)],
    ]
  );

  if (emailAkun) {
    await run(
      "INSERT INTO users (id, nama, email, password, role, dudi_id) VALUES (?,?,?,?,?,?)",
      [
        newId(),
        pembimbing?.trim() || nama.trim(),
        emailAkun,
        hashPassword(sandiAkun),
        "dudi",
        id,
      ]
    );
  }

  return NextResponse.json(
    { ok: true, dudi: (await listDudi({ id }))[0] ?? null },
    { status: 201 }
  );
}
