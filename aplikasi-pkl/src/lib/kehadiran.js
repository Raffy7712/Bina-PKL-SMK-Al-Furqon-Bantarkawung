import { hariKerja, jumlahHari } from "./tanggal";

const pad = (n) => String(n).padStart(2, "0");

export function kehadiranBulanan(st, { tahun, bulan, hariIni, akhirISO } = {}) {
  if (!st) return { ada: false, jml: 0, hadir: 0, bulan: 0, pct: 0 };
  const n = st.bulan ?? 0;
  const dasar = { ada: true, jml: st.jml ?? 0, hadir: st.hadir ?? 0, bulan: n };
  if (!tahun || !bulan) return { ...dasar, pct: 0 };

  const awalISO = `${tahun}-${pad(bulan)}-01`;
  const berjalan = !!hariIni && hariIni.startsWith(`${tahun}-${pad(bulan)}`);
  const akhir =
    akhirISO ??
    (berjalan ? hariIni : `${tahun}-${pad(bulan)}-${jumlahHari(tahun, bulan)}`);

  if (st.mulai && st.mulai > akhir) return { ...dasar, pct: 0 };
  const efektif = st.mulai && st.mulai > awalISO ? st.mulai : awalISO;
  const kerja = hariKerja(efektif, akhir);
  const pct =
    kerja > 0 ? Math.max(0, Math.min(100, Math.round((n / kerja) * 100))) : 0;
  return { ...dasar, pct };
}
