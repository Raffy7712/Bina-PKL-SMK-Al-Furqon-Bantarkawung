import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db, run, one, newId, hashPassword, transaksi } from "@/lib/db";
import { listDudi } from "@/lib/serialize";
import { cekFormatEmail, cekSandi, pemakaiEmail } from "@/lib/akun";
import { resolveLocation, mapsLinkFromCoords } from "@/lib/geocode";
import { radiusValid, RADIUS_BAWAAN_M } from "@/lib/jarak";

export async function PATCH(request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const lama = await one("SELECT * FROM dudi WHERE id = ?", [id]);
  if (!lama) {
    return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const teks = (v, lama) => (v === undefined ? lama : String(v).trim());
  const nama = teks(body.nama, lama.nama);
  if (!nama) {
    return NextResponse.json({ error: "Nama mitra wajib diisi" }, { status: 400 });
  }
  const bidang = teks(body.bidang, lama.bidang ?? "");
  const alamat = teks(body.alamat, lama.alamat ?? "");
  const kota = teks(body.kota, lama.kota ?? "");
  const pembimbing = teks(body.pembimbing, lama.pembimbing ?? "");
  const kontak = teks(body.kontak, lama.kontak ?? "");
  const jam = teks(body.jam, lama.jam ?? "");

  const akunLama = await one(
    "SELECT id, email, google_email FROM users WHERE dudi_id = ? ORDER BY created_at, id LIMIT 1",
    [id]
  );
  const emailBaru = body.email !== undefined ? String(body.email).trim() : undefined;
  const sandiBaru = body.sandi !== undefined ? String(body.sandi) : "";

  let buatAkun = null;
  let ubahEmail = null;
  let ubahSandi = null;

  if (!akunLama) {
    if ((emailBaru ?? "") !== "" || sandiBaru !== "") {
      if (!emailBaru) {
        return NextResponse.json(
          { error: "Isi email akun pembimbing juga." },
          { status: 400 }
        );
      }
      const galatEmail = cekFormatEmail(emailBaru);
      if (galatEmail) return NextResponse.json({ error: galatEmail }, { status: 400 });
      const pemakai = await pemakaiEmail(emailBaru);
      if (pemakai) {
        return NextResponse.json(
          { error: `Email sudah dipakai akun lain (${pemakai.nama}).` },
          { status: 409 }
        );
      }
      const galatSandi = cekSandi(sandiBaru, { wajib: true });
      if (galatSandi) return NextResponse.json({ error: galatSandi }, { status: 400 });
      buatAkun = { email: emailBaru, sandi: sandiBaru };
    }
  } else {
    if (emailBaru && emailBaru.toLowerCase() !== String(akunLama.email ?? "").toLowerCase()) {
      const galatEmail = cekFormatEmail(emailBaru);
      if (galatEmail) return NextResponse.json({ error: galatEmail }, { status: 400 });
      const pemakai = await pemakaiEmail(emailBaru, akunLama.id);
      if (pemakai) {
        return NextResponse.json(
          { error: `Email sudah dipakai akun lain (${pemakai.nama}).` },
          { status: 409 }
        );
      }
      ubahEmail = emailBaru;
    }
    if (sandiBaru) {
      const galatSandi = cekSandi(sandiBaru, { wajib: false });
      if (galatSandi) return NextResponse.json({ error: galatSandi }, { status: 400 });
      ubahSandi = sandiBaru;
    }
  }

  let lat = body.lat != null && Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  let lng = body.lng != null && Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;
  let mapsUrl = body.mapsUrl !== undefined ? String(body.mapsUrl).trim() : "";
  if (body.radiusM !== undefined && radiusValid(body.radiusM) == null) {
    return NextResponse.json(
      { error: "Radius check-in harus 10 sampai 5000 meter" },
      { status: 400 }
    );
  }
  const radiusM = radiusValid(body.radiusM) ?? lama.radius_m ?? RADIUS_BAWAAN_M;
  let label = null;

  const adaTitikBaru = lat != null && lng != null;
  if (!adaTitikBaru) {
    lat = lama.lat ?? null;
    lng = lama.lng ?? null;
    if (mapsUrl && mapsUrl !== (lama.maps_url ?? "")) {
      try {
        const loc = await resolveLocation(mapsUrl);
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
  }
  if (adaTitikBaru && !mapsUrl) {
    mapsUrl = mapsLinkFromCoords(lat, lng) ?? "";
  }

  await run(
    `UPDATE dudi SET nama=?, bidang=?, alamat=?, kota=?, maps_url=?, lat=?, lng=?,
                      pembimbing=?, kontak=?, jam=?, radius_m=?
     WHERE id=?`,
    [
      nama,
      bidang,
      alamat || label || "",
      kota,
      mapsUrl || lama.maps_url,
      lat,
      lng,
      pembimbing,
      kontak,
      jam,
      radiusM,
      id,
    ]
  );

  if (buatAkun) {
    await run(
      "INSERT INTO users (id, nama, email, password, role, dudi_id) VALUES (?,?,?,?,?,?)",
      [
        newId(),
        pembimbing || nama,
        buatAkun.email,
        hashPassword(buatAkun.sandi),
        "dudi",
        id,
      ]
    );
  }
  if (ubahEmail) {
    await run("UPDATE users SET email = ? WHERE id = ?", [ubahEmail, akunLama.id]);
  }
  if (ubahSandi) {
    await run("UPDATE users SET password = ? WHERE id = ?", [
      hashPassword(ubahSandi),
      akunLama.id,
    ]);
  }

  return NextResponse.json({ ok: true, dudi: (await listDudi({ id }))[0] ?? null });
}

export async function DELETE(_request, { params }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const mitra = await one("SELECT id, nama FROM dudi WHERE id = ?", [id]);
  if (!mitra) {
    return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
  }

  const { n } = await one("SELECT COUNT(*) AS n FROM siswa WHERE dudi_id = ?", [id]);
  if (n > 0) {
    return NextResponse.json(
      {
        error: `Tidak bisa dihapus, masih ada ${n} siswa PKL di mitra "${mitra.nama}". Pindahkan mereka dulu.`,
        jumlah: n,
      },
      { status: 409 }
    );
  }

  let akunDihapus = 0;
  try {
    await transaksi(async (conn) => {
      const [r] = await conn.execute("DELETE FROM users WHERE dudi_id = ?", [id]);
      akunDihapus = r.affectedRows ?? 0;
      await conn.execute("DELETE FROM dudi WHERE id = ?", [id]);
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus mitra. Masih ada data yang memakainya." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, akunDihapus });
}
