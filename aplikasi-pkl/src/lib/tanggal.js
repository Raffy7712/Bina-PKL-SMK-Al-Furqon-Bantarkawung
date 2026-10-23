"use client";

import { useSyncExternalStore } from "react";

export const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const NAMA_BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const langganan = () => () => {};
const pad = (n) => String(n).padStart(2, "0");

export function isoHariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useHariIni() {
  return useSyncExternalStore(langganan, isoHariIni, () => "");
}

export function formatTanggalPanjang(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${NAMA_HARI[date.getDay()]}, ${d} ${NAMA_BULAN_SINGKAT[m - 1]} ${y}`;
}

export function formatTanggalPendek(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${NAMA_BULAN_SINGKAT[m - 1]} ${y}`;
}

export function waktuLalu(waktu) {
  if (!waktu) return "";
  const teks = String(waktu);
  const t = new Date(teks.replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return "";
  const detik = Math.max(0, Math.round((Date.now() - t.getTime()) / 1000));
  if (detik < 60) return "baru saja";
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatTanggalPendek(teks.slice(0, 10));
}

export function jumlahHari(tahun, bulan) {
  return new Date(tahun, bulan, 0).getDate();
}

export function geserBulan(tahun, bulan, delta) {
  const d = new Date(tahun, bulan - 1 + delta, 1);
  return { tahun: d.getFullYear(), bulan: d.getMonth() + 1 };
}

export function hariKerja(dariISO, sampaiISO) {
  if (!dariISO || !sampaiISO || dariISO > sampaiISO) return 0;
  const [y1, m1, d1] = dariISO.split("-").map(Number);
  const [y2, m2, d2] = sampaiISO.split("-").map(Number);
  const akhir = new Date(y2, m2 - 1, d2);
  let n = 0;
  for (const t = new Date(y1, m1 - 1, d1); t <= akhir; t.setDate(t.getDate() + 1)) {
    const g = t.getDay();
    if (g !== 0 && g !== 6) n++;
  }
  return n;
}
