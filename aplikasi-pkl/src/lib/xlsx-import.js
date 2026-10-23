
const KANDIDAT = {
  nis: ["nis", "nisn", "no induk", "nomor induk", "no induk"],
  nama: ["nama", "name", "siswa"],
  kelas: ["kelas", "rombel", "class", "tingkat"],
  mitra: ["mitra", "tempat pkl", "tempat", "dudi", "lokasi kerja", "tempat kerja", "industri", "perusahaan"],
};

export function normJudul(teks) {
  return String(teks ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function deteksiKolom(baris) {
  const sel = (Array.isArray(baris) ? baris : []).map(normJudul);
  const hasil = { nis: -1, nama: -1, kelas: -1, mitra: -1 };
  const dipakai = new Set();
  const urut = ["nis", "nama", "kelas", "mitra"];
  for (const langkah of [0, 1]) {
    for (const kunci of urut) {
      if (hasil[kunci] !== -1) continue;
      const i = sel.findIndex(
        (s, j) =>
          !dipakai.has(j) &&
          (langkah === 0
            ? KANDIDAT[kunci].includes(s)
            : KANDIDAT[kunci].some((k) => s.includes(k)))
      );
      if (i !== -1) {
        hasil[kunci] = i;
        dipakai.add(i);
      }
    }
  }
  return hasil;
}

export function selTeks(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v).trim();
  if (typeof v === "boolean") return v ? "Ya" : "";
  if (typeof v === "object") return String(v.text ?? v.result ?? "").trim();
  return String(v).trim();
}

export function siapkanImpor(data, { nisTerdaftar = [], mitraDikenal = [], kelasDikenal = [] } = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return { galat: "Berkas kosong, tidak ada data pada lembar pertama." };
  }

  const idxHeader = data.findIndex((r) => {
    const k = deteksiKolom(r);
    return k.nis !== -1 && k.nama !== -1;
  });
  if (idxHeader === -1) {
    return {
      galat:
        "Kolom NIS dan Nama tidak ditemukan di berkas. Unduh template resmi lalu isi sesuai judul kolomnya.",
    };
  }

  const kolom = deteksiKolom(data[idxHeader]);
  const sudahAda = new Set(nisTerdaftar.map((n) => String(n).trim()));
  const namaMitra = new Set(mitraDikenal.map((m) => String(m).trim().toLowerCase()));
  const namaKelas = new Set(kelasDikenal.map((k) => String(k).trim().toLowerCase()));
  const terlihat = new Map();
  const baris = [];
  let kosong = 0;

  for (let i = idxHeader + 1; i < data.length; i++) {
    const r = data[i] ?? [];
    const b = {
      baris: i + 1,
      nis: kolom.nis === -1 ? "" : selTeks(r[kolom.nis]),
      nama: kolom.nama === -1 ? "" : selTeks(r[kolom.nama]),
      kelas: kolom.kelas === -1 ? "" : selTeks(r[kolom.kelas]),
      mitra: kolom.mitra === -1 ? "" : selTeks(r[kolom.mitra]),
      masalah: [],
    };
    if (!b.nis && !b.nama) {
      kosong++;
      continue;
    }
    if (!b.nis) b.masalah.push("NIS wajib diisi");
    if (!b.nama) b.masalah.push("Nama wajib diisi");
    if (b.nis) {
      if (terlihat.has(b.nis)) b.masalah.push(`NIS sama dengan baris ${terlihat.get(b.nis)}`);
      else terlihat.set(b.nis, b.baris);
      if (sudahAda.has(b.nis)) b.masalah.push("NIS sudah terdaftar di database");
    }
    if (b.mitra && namaMitra.size > 0 && !namaMitra.has(b.mitra.toLowerCase())) {
      b.masalah.push(`Mitra "${b.mitra}" tidak dikenal`);
    }
    if (
      b.kelas &&
      b.kelas.toLowerCase() !== "belum ditentukan" &&
      namaKelas.size > 0 &&
      !namaKelas.has(b.kelas.toLowerCase())
    ) {
      b.masalah.push(`Kelas "${b.kelas}" belum terdaftar`);
    }
    baris.push(b);
  }

  if (baris.length === 0) {
    return { galat: "Tidak ada baris data setelah baris judul." };
  }

  const siap = baris.filter((b) => b.masalah.length === 0);
  return { kolom, baris, siap, kosong, bermasalah: baris.length - siap.length };
}
