import { NextResponse } from "next/server";
import { randomBytes, scrypt } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { db, run, one, all, newId, transaksi } from "@/lib/db";
import { emailSiswa } from "@/lib/domain";

const BATAS = 500;
const PER_HASH = 8;

function hashAsync(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, derived) =>
      err ? reject(err) : resolve(`s2$${salt}$${derived.toString("hex")}`)
    );
  });
}

async function hashBanyak(passwords) {
  const out = [];
  for (let i = 0; i < passwords.length; i += PER_HASH) {
    const chunk = passwords.slice(i, i + PER_HASH);
    out.push(...(await Promise.all(chunk.map(hashAsync))));
  }
  return out;
}

export async function POST(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows wajib berupa daftar berisi" }, { status: 400 });
  }
  if (rows.length > BATAS) {
    return NextResponse.json(
      { error: `Maksimal ${BATAS} baris per kiriman` },
      { status: 400 }
    );
  }

  const dudiByName = new Map(
    (await all("SELECT id, nama FROM dudi")).map((d) => [d.nama.trim().toLowerCase(), d.id])
  );
  const kelasResmi = new Set(
    (await all("SELECT nama FROM kelas")).map((k) => String(k.nama).trim().toLowerCase())
  );
  const hasil = [];
  const sah = [];
  const dalamBatch = new Set();

  for (const raw of rows) {
    const r = raw ?? {};
    const nis = String(r.nis ?? "").trim();
    const nama = String(r.nama ?? "").trim();
    const kelas = String(r.kelas ?? "").trim();
    const mitra = String(r.mitra ?? "").trim();

    if (!nis && !nama) {
      hasil.push({ nis, nama: "", status: "lewat", pesan: "Baris kosong" });
      continue;
    }
    if (!nis || !nama) {
      hasil.push({
        nis,
        nama,
        status: "galat",
        pesan: "NIS dan nama wajib diisi",
      });
      continue;
    }
    if (dalamBatch.has(nis)) {
      hasil.push({ nis, nama, status: "lewat", pesan: "NIS ganda dalam kiriman" });
      continue;
    }
    if (await one("SELECT id FROM siswa WHERE nis = ?", [nis])) {
      hasil.push({ nis, nama, status: "lewat", pesan: "NIS sudah terdaftar" });
      continue;
    }
    let dudiId = null;
    if (mitra) {
      dudiId = dudiByName.get(mitra.toLowerCase()) ?? null;
      if (!dudiId) {
        hasil.push({
          nis,
          nama,
          status: "galat",
          pesan: `Mitra "${mitra}" tidak dikenal`,
        });
        continue;
      }
    }
    if (
      kelas &&
      kelas.toLowerCase() !== "belum ditentukan" &&
      !kelasResmi.has(kelas.toLowerCase())
    ) {
      hasil.push({
        nis,
        nama,
        status: "galat",
        pesan: `Kelas "${kelas}" belum terdaftar`,
      });
      continue;
    }
    dalamBatch.add(nis);
    sah.push({ nis, nama, kelas, dudiId, hash: null });
    hasil.push({ nis, nama, status: "ok", pesan: "Berhasil diimpor" });
  }

  try {
    const hashes = await hashBanyak(sah.map((s) => s.nis));
    sah.forEach((s, i) => (s.hash = hashes[i]));
  } catch {
    return NextResponse.json(
      { error: "Gagal menyiapkan kata sandi, coba lagi" },
      { status: 500 }
    );
  }

  try {
    await transaksi(async (conn) => {
      for (const s of sah) {
        const id = newId();
        await conn.execute(
          "INSERT INTO siswa (id, nis, nama, kelas, status, dudi_id) VALUES (?,?,?,?,?,?)",
          [id, s.nis, s.nama, s.kelas || "Belum ditentukan", "aktif", s.dudiId]
        );
        await conn.execute(
          "INSERT INTO users (id, nama, email, password, role, siswa_id) VALUES (?,?,?,?,?,?)",
          [newId(), s.nama, emailSiswa(s.nis), s.hash, "siswa", id]
        );
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menyimpan data impor." },
      { status: 500 }
    );
  }

  const dibuat = sah.length;
  const lewat = hasil.filter((h) => h.status === "lewat").length;
  const galat = hasil.filter((h) => h.status === "galat").length;
  return NextResponse.json({ ok: true, dibuat, lewat, galat, hasil });
}
