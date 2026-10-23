import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import {
  catatNotifikasi,
  catatWaTunggu,
  kirimPengingatJurnal,
  penggunaDudi,
  penggunaSiswa,
} from "@/lib/notifikasi";

const PESAN_SISWA = "Halo {nama}, ada informasi dari admin PKL.";
const PESAN_DUDI = "Halo {nama}, ada informasi dari admin PKL.";

const isiTemplate = (tpl, siswa) =>
  tpl.replaceAll("{nama}", siswa.nama).replaceAll("{nis}", siswa.nis ?? "");

export async function POST(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const mode = String(body.mode ?? "");
  const pesanKustom = String(body.pesan ?? "").trim().slice(0, 1000);

  if (mode === "siswa" || mode === "dudi") {
    const nomorPesan = pesanKustom || (mode === "siswa" ? PESAN_SISWA : PESAN_DUDI);

    if (mode === "siswa") {
      const siswa = await one("SELECT * FROM siswa WHERE id = ?", [body.id]);
      if (!siswa) {
        return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
      }
      const pesan = isiTemplate(nomorPesan, siswa);
      const r = await catatWaTunggu({
        tujuan: siswa.nama,
        jenis: "pesan",
        judul: "Pesan dari admin",
        pesan,
        nomor: siswa.telepon,
      });
      for (const userId of await penggunaSiswa(siswa.id)) {
        await catatNotifikasi({ userId, jenis: "pesan", judul: "Pesan dari admin", pesan });
      }
      return NextResponse.json({ ok: true, ...rangkum([{ nama: siswa.nama, nomor: siswa.telepon, status: r.status, error: r.error }]) });
    }

    const dudi = await one("SELECT * FROM dudi WHERE id = ?", [body.id]);
    if (!dudi) {
      return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
    }
    const pesan = nomorPesan
      .replaceAll("{nama}", dudi.pembimbing || dudi.nama)
      .replaceAll("{nis}", "");
    const r = await catatWaTunggu({
      tujuan: `${dudi.nama} (pembimbing DUDI)`,
      jenis: "pesan",
      judul: "Pesan dari admin",
      pesan,
      nomor: dudi.kontak,
    });
    for (const userId of await penggunaDudi(dudi.id)) {
      await catatNotifikasi({ userId, jenis: "pesan", judul: "Pesan dari admin", pesan });
    }
    return NextResponse.json({ ok: true, ...rangkum([{ nama: dudi.pembimbing || dudi.nama, nomor: dudi.kontak, status: r.status, error: r.error }]) });
  }

  if (mode === "pengingat-jurnal") {
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((v) => typeof v === "string")
      : typeof body.id === "string" && body.id
        ? [body.id]
        : [];

    const semua = body.semua === true;
    let r = await kirimPengingatJurnal({
      pesanKustom,
      siswaIds: ids,
      hanyaYangBelum: !semua,
    });

    if (ids.length > 0 && r.total === 0 && !semua) {
      r = await kirimPengingatJurnal({
        pesanKustom,
        siswaIds: ids,
        hanyaYangBelum: false,
      });
    }

    if (ids.length > 0 && r.total === 0) {
      return NextResponse.json(
        {
          error:
            body.semua === true
              ? "Siswa itu tidak ditemukan atau tidak aktif."
              : "Siswa itu sudah mengisi jurnal hari ini. Kirim ulang dengan pilihan tetap kirim.",
          ...r,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, ...r, hasil: r.hasil.slice(0, 50) });
  }

  return NextResponse.json({ error: "Mode tidak dikenal" }, { status: 400 });
}

function rangkum(hasil) {
  let terkirim = 0;
  let gagal = 0;
  let tanpaNomor = 0;
  for (const h of hasil) {
    if (h.status === "terkirim") terkirim++;
    else if (h.status === "gagal") gagal++;
    else tanpaNomor++;
  }
  return { total: hasil.length, terkirim, gagal, tanpaNomor, dilewati: 0, hasil };
}
