import { one, run, transaksi } from "./db";
import { kirimPengingatJurnal } from "./notifikasi";

const KUNCI = {
  aktif: "pengingatAktif",
  jam: "pengingatJam",
  hari: "pengingatHari",
  terakhir: "pengingatTerakhir",
  hasil: "pengingatHasil",
};

export const PENGINGAT_BAWAAN = { aktif: true, jam: 10, hari: [1, 2, 3, 4, 5] };

const pad = (n) => String(n).padStart(2, "0");

export function isoLokal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function baca(kunci) {
  return (await one("SELECT nilai FROM pengaturan WHERE kunci = ?", [kunci]))?.nilai ?? null;
}

async function simpan(kunci, nilai) {
  await run(
    `INSERT INTO pengaturan (kunci, nilai, diubah)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), diubah = VALUES(diubah)`,
    [kunci, String(nilai)]
  );
}

export async function bacaPengaturanPengingat() {
  const aktif = await baca(KUNCI.aktif);
  const jam = Number.parseInt((await baca(KUNCI.jam)) ?? "", 10);
  const hari = String((await baca(KUNCI.hari)) ?? "")
    .split(",")
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return {
    aktif: aktif == null ? PENGINGAT_BAWAAN.aktif : aktif === "1",
    jam: Number.isInteger(jam) && jam >= 0 && jam <= 23 ? jam : PENGINGAT_BAWAAN.jam,
    hari: hari.length ? [...new Set(hari)].sort((a, b) => a - b) : [...PENGINGAT_BAWAAN.hari],
  };
}

export async function simpanPengaturanPengingat({ aktif, jam, hari }) {
  if (aktif !== undefined) await simpan(KUNCI.aktif, aktif ? "1" : "0");
  if (jam !== undefined) await simpan(KUNCI.jam, String(Number(jam)));
  if (hari !== undefined) await simpan(KUNCI.hari, hari.join(","));
  return await bacaPengaturanPengingat();
}

export async function bacaHasilPengingat() {
  try {
    const isi = await baca(KUNCI.hasil);
    return JSON.parse(isi ?? "null");
  } catch {
    return null;
  }
}

async function klaimHariIni(tanggal) {
  return await transaksi(async (conn) => {
    const [rows] = await conn.execute(
      "SELECT nilai FROM pengaturan WHERE kunci = ? FOR UPDATE",
      [KUNCI.terakhir]
    );
    if (rows[0]?.nilai === tanggal) return false;
    await conn.execute(
      `INSERT INTO pengaturan (kunci, nilai, diubah) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), diubah = VALUES(diubah)`,
      [KUNCI.terakhir, String(tanggal)]
    );
    return true;
  });
}

export async function jalankanPengingatOtomatis({ abaikanJadwal = false } = {}) {
  const atur = await bacaPengaturanPengingat();
  const sekarang = new Date();
  const tanggal = isoLokal(sekarang);

  if (!abaikanJadwal) {
    if (!atur.aktif) return { dijalankan: false, alasan: "nonaktif" };
    if (!atur.hari.includes(sekarang.getDay()))
      return { dijalankan: false, alasan: "bukan_hari_pengingat" };
    if (sekarang.getHours() !== atur.jam)
      return { dijalankan: false, alasan: "belum_jamnya" };
  }

  if (!(await klaimHariIni(tanggal))) {
    return { dijalankan: false, alasan: "sudah_dijalankan_hari_ini" };
  }

  const ringkas = await kirimPengingatJurnal({});
  await simpan(
    KUNCI.hasil,
    JSON.stringify({
      tanggal,
      jam: sekarang.getHours(),
      ...ringkas,
      hasil: ringkas.hasil.slice(0, 50),
    })
  );
  return { dijalankan: true, tanggal, ...ringkas };
}

export async function mulaiPenjadwalPengingat() {
  if (globalThis.__pklPengingat) return;
  const tik = async () => {
    await jalankanPengingatOtomatis().catch((e) =>
      console.error("[pengingat] gagal:", e?.message ?? e)
    );
  };
  const timer = setInterval(tik, 60_000);
  timer.unref?.();
  globalThis.__pklPengingat = timer;
  tik();
}
