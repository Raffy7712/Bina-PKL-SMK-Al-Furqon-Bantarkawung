import { formatTanggal, HARI, BULAN, FILTER_STATUS } from "./mock";

export { formatTanggal, HARI, BULAN, FILTER_STATUS };

export function formatWaktu(waktu, withYear = false) {
  const teks = String(waktu ?? "").trim();
  if (!teks) return "-";
  const [tanggal, jamRaw = ""] = teks.split(/[ T]/);
  const [y, m, d] = tanggal.split("-").map(Number);
  if (!y || !m || !d) return teks;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return teks;
  const out = `${HARI[date.getDay()]}, ${d} ${BULAN[m - 1]}${withYear ? ` ${y}` : ""}`;
  const jam = jamRaw.slice(0, 5);
  return jam ? `${out} · ${jam}` : out;
}

export function jurnalValid(list) {
  return list.filter((j) => j.status !== "ditolak");
}

export function rekapHadirDari(list, siswaId, tahun = 2026, bulan = 9) {
  const tanggal = new Set();
  for (const j of jurnalValid(list)) {
    if (siswaId && j.siswaId !== siswaId) continue;
    const [y, m] = j.tanggal.split("-").map(Number);
    if (y === tahun && m - 1 === bulan) tanggal.add(j.tanggal);
  }
  return tanggal.size;
}

export function kalenderHadirDari(list, tahun = 2026, bulan = 9, hariIniIso) {
  const valid = jurnalValid(list);
  const punya = new Set(valid.map((j) => j.tanggal));
  const hariIni =
    hariIniIso ??
    valid.reduce(
      (max, j) => (j.tanggal > max ? j.tanggal : max),
    "0000-00-00"
  );

  const totalHari = new Date(tahun, bulan + 1, 0).getDate();
  const cells = [];
  for (let d = 1; d <= totalHari; d++) {
    const date = new Date(tahun, bulan, d);
    const iso = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const lewat = iso > hariIni && hariIni !== "0000-00-00";
    let state = "kosong";
    if (weekend) state = "libur";
    else if (punya.has(iso)) state = "hadir";
    else if (lewat) state = "akan";
    else state = "alpa";
    cells.push({ d, iso, state, hari: date.getDay() });
  }
  return cells;
}

export function cariDudi(dudiList, dudiId) {
  return dudiList.find((d) => d.id === dudiId) ?? dudiList[0] ?? null;
}

export function cariSiswa(siswaList, id) {
  return siswaList.find((s) => s.id === id) ?? null;
}

export function hitungStatus(list) {
  const out = { menunggu_dudi: 0, menunggu_sekolah: 0, diterima: 0, ditolak: 0 };
  for (const j of list) out[j.status] = (out[j.status] ?? 0) + 1;
  return out;
}
