export const ASPEK_PENILAIAN = [
  { kode: "isi", label: "Kelengkapan Isi" },
  { kode: "format", label: "Kerapian & Format" },
  { kode: "analisis", label: "Analisis & Pembahasan" },
  { kode: "presentasi", label: "Presentasi Lisan" },
];

export const KODE_PENILAIAN = ASPEK_PENILAIAN.map((a) => a.kode);

export function normalisasiPenilaian(input) {
  if (input == null) return { nilai: null };
  if (typeof input !== "object" || Array.isArray(input)) {
    return { error: "Format penilaian tidak valid" };
  }

  const nilai = {};
  let terisi = 0;
  for (const aspek of ASPEK_PENILAIAN) {
    const raw = input[aspek.kode];
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: `Nilai ${aspek.label} harus angka 0–100` };
    }
    nilai[aspek.kode] = Math.round(n * 10) / 10;
    terisi++;
  }

  if (terisi === 0) return { nilai: null };
  if (terisi < ASPEK_PENILAIAN.length) {
    return {
      error: "Nilai rubrik harus diisi keempat aspek atau dikosongkan semua",
    };
  }
  return { nilai };
}

export function rataPenilaian(penilaian) {
  if (!penilaian || typeof penilaian !== "object") return null;
  const angka = KODE_PENILAIAN.map((k) => Number(penilaian[k])).filter((n) =>
    Number.isFinite(n)
  );
  if (!angka.length) return null;
  return (
    Math.round((angka.reduce((a, b) => a + b, 0) / angka.length) * 10) / 10
  );
}
