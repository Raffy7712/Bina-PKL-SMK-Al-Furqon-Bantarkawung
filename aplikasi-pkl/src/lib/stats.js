import { all, one } from "./db";
import { listJurnal, STATUS_VALID } from "./serialize";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function scope(user, table) {
  if (user.role === "dudi" && user.dudi_id) {
    return {
      join: ` JOIN siswa s ON s.id = ${table}.siswa_id`,
      where: " WHERE s.dudi_id = ?",
      params: [user.dudi_id],
    };
  }
  return { join: "", where: "", params: [] };
}

function rangkumStatus(rows) {
  const out = { total: 0 };
  for (const s of STATUS_VALID) out[s] = 0;
  for (const r of rows) {
    out[r.status] = (out[r.status] ?? 0) + r.n;
    out.total += r.n;
  }
  return out;
}

export async function ringkas(user) {
  const j = scope(user, "j");

  const statusRows = await all(
    `SELECT j.status AS status, COUNT(*) AS n FROM jurnal j${j.join}${j.where} GROUP BY j.status`,
    j.params
  );
  const jurnal = rangkumStatus(statusRows);

  const anchor = (await one(
    `SELECT MAX(j.tanggal) AS t FROM jurnal j${j.join}${j.where}`,
    j.params
  ))?.t ?? null;

  let sparkline = [];
  let bulan = rangkumStatus([]);
  if (anchor) {
    const [y, m, d] = anchor.split("-").map(Number);
    const tanggal7 = [];
    for (let i = 6; i >= 0; i--) tanggal7.push(iso(new Date(y, m - 1, d - i)));

    const in7 = tanggal7.map(() => "?").join(",");
    const w7 = j.where ? `${j.where} AND j.tanggal IN (${in7})` : ` WHERE j.tanggal IN (${in7})`;
    const counts = await all(
      `SELECT j.tanggal AS tanggal, COUNT(*) AS n FROM jurnal j${j.join}${w7} GROUP BY j.tanggal`,
      [...j.params, ...tanggal7]
    );
    const map = Object.fromEntries(counts.map((r) => [r.tanggal, r.n]));
    sparkline = tanggal7.map((tanggal) => ({ tanggal, n: map[tanggal] ?? 0 }));

    const sejak = `${y}-${pad(m)}-01`;
    const sampai = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
    const wB = j.where
      ? `${j.where} AND j.tanggal >= ? AND j.tanggal < ?`
      : ` WHERE j.tanggal >= ? AND j.tanggal < ?`;
    bulan = rangkumStatus(
      await all(
        `SELECT j.status AS status, COUNT(*) AS n FROM jurnal j${j.join}${wB} GROUP BY j.status`,
        [...j.params, sejak, sampai]
      )
    );
  }

  const siswaRows =
    user.role === "dudi" && user.dudi_id
      ? await all("SELECT status, COUNT(*) AS n FROM siswa WHERE dudi_id = ? GROUP BY status", [user.dudi_id])
      : await all("SELECT status, COUNT(*) AS n FROM siswa GROUP BY status");
  const siswa = { total: 0, aktif: 0 };
  for (const r of siswaRows) {
    siswa.total += r.n;
    if (r.status === "aktif") siswa.aktif = r.n;
  }

  const l = scope(user, "l");
  const laporanRows = await all(
    `SELECT l.status AS status, COUNT(*) AS n FROM laporan l${l.join}${l.where} GROUP BY l.status`,
    l.params
  );
  const laporan = { total: 0, draft: 0, terkirim: 0, revisi: 0, diterima: 0 };
  for (const r of laporanRows) {
    laporan.total += r.n;
    laporan[r.status] = (laporan[r.status] ?? 0) + r.n;
  }

  const kondisiSiswa = ["s.status = 'aktif'", "s.dudi_id IS NOT NULL"];
  const paramsSiswa = [];
  if (user.role === "dudi" && user.dudi_id) {
    kondisiSiswa.push("s.dudi_id = ?");
    paramsSiswa.push(user.dudi_id);
  }
  const tanggalHariIni = iso(new Date());
  const sudahHariIni =
    (
      await one(
        `SELECT COUNT(DISTINCT j.siswa_id) AS n
         FROM jurnal j JOIN siswa s ON s.id = j.siswa_id
         WHERE j.tanggal = ? AND ${kondisiSiswa.join(" AND ")}`,
        [tanggalHariIni, ...paramsSiswa]
      )
    )?.n ?? 0;
  const totalHariIni =
    (
      await one(
        `SELECT COUNT(*) AS n FROM siswa s WHERE ${kondisiSiswa.join(" AND ")}`,
        paramsSiswa
      )
    )?.n ?? 0;
  const hariIni = {
    tanggal: tanggalHariIni,
    sudah: sudahHariIni,
    belum: Math.max(0, totalHariIni - sudahHariIni),
    total: totalHariIni,
  };

  const terbaru = await listJurnal({
    dudiId: user.role === "dudi" ? user.dudi_id : undefined,
    limit: 5,
  });

  let kehadiran = { hadir: 0, hariKerja: 0, siswa: 0, persen: 0 };
  if (anchor) {
    const [y, m, d] = anchor.split("-").map(Number);
    const sejakK = `${y}-${pad(m)}-01`;
    const wK = j.where
      ? `${j.where} AND j.tanggal >= ? AND j.tanggal <= ?`
      : ` WHERE j.tanggal >= ? AND j.tanggal <= ?`;
    const hadir =
      (
        await one(
          `SELECT COUNT(DISTINCT j.siswa_id || '|' || j.tanggal) AS n
           FROM jurnal j${j.join}${wK} AND j.status != 'ditolak'`,
          [...j.params, sejakK, anchor]
        )
      )?.n ?? 0;
    let kerja = 0;
    for (const t = new Date(y, m - 1, 1); t <= new Date(y, m - 1, d); t.setDate(t.getDate() + 1)) {
      const g = t.getDay();
      if (g !== 0 && g !== 6) kerja++;
    }
    const basis = siswa.aktif * kerja;
    kehadiran = {
      hadir,
      hariKerja: kerja,
      siswa: siswa.aktif,
      persen: basis ? Math.min(100, Math.round((hadir / basis) * 100)) : 0,
    };
  }

  return {
    jurnal: { ...jurnal, bulan, periode: anchor ? anchor.slice(0, 7) : null },
    sparkline,
    siswa,
    laporan,
    terbaru,
    kehadiran,
    hariIni,
    aktivitas: await aktivitas(user),
  };
}

export async function aktivitas(user, batas = 8) {
  if (user.role === "dudi" && !user.dudi_id) return [];
  const dudiId = user.role === "dudi" ? user.dudi_id : null;
  const sf = dudiId ? " AND s.dudi_id = ?" : "";
  const pf = dudiId ? [dudiId] : [];
  const hasil = [];

  for (const r of await all(
    `SELECT j.id AS ref, j.created_at AS waktu, s.nama AS nama, j.judul AS subjek
     FROM jurnal j JOIN siswa s ON s.id = j.siswa_id
     WHERE 1=1${sf} ORDER BY j.created_at DESC LIMIT ?`,
    [...pf, batas]
  )) {
    hasil.push({
      id: `jurnal:${r.ref}`,
      kategori: "jurnal",
      aksi: "Jurnal Baru",
      detail: `${r.nama} menulis jurnal “${r.subjek}”`,
      waktu: r.waktu,
    });
  }

  for (const r of await all(
    `SELECT j.id AS ref, j.verifikasi_dudi_at AS waktu, j.verifikasi_dudi_hasil AS hasil,
            s.nama AS nama, j.judul AS subjek
     FROM jurnal j JOIN siswa s ON s.id = j.siswa_id
     WHERE j.verifikasi_dudi_at IS NOT NULL${sf}
     ORDER BY j.verifikasi_dudi_at DESC LIMIT ?`,
    [...pf, batas]
  )) {
    const tolak = r.hasil === "tolak";
    hasil.push({
      id: `dudi:${r.ref}`,
      kategori: "verifikasi-dudi",
      aksi: tolak ? "Ditolak DUDI" : "Verifikasi DUDI",
      detail: tolak
        ? `Jurnal ${r.nama} “${r.subjek}” dikembalikan pembimbing DUDI`
        : `Jurnal ${r.nama} “${r.subjek}” lolos verifikasi DUDI`,
      waktu: r.waktu,
    });
  }

  for (const r of await all(
    `SELECT j.id AS ref, j.verifikasi_sekolah_at AS waktu, j.verifikasi_sekolah_hasil AS hasil,
            s.nama AS nama, j.judul AS subjek
     FROM jurnal j JOIN siswa s ON s.id = j.siswa_id
     WHERE j.verifikasi_sekolah_at IS NOT NULL${sf}
     ORDER BY j.verifikasi_sekolah_at DESC LIMIT ?`,
    [...pf, batas]
  )) {
    const tolak = r.hasil === "tolak";
    hasil.push({
      id: `sekolah:${r.ref}`,
      kategori: "verifikasi-sekolah",
      aksi: tolak ? "Ditolak Sekolah" : "Jurnal Diterima",
      detail: tolak
        ? `Jurnal ${r.nama} “${r.subjek}” dikembalikan pembimbing sekolah`
        : `Jurnal ${r.nama} “${r.subjek}” diterima pembimbing sekolah`,
      waktu: r.waktu,
    });
  }

  for (const r of await all(
    `SELECT l.id AS ref, l.updated_at AS waktu, l.status AS status,
            l.judul AS subjek, l.versi AS versi, s.nama AS nama
     FROM laporan l JOIN siswa s ON s.id = l.siswa_id
     WHERE 1=1${sf} ORDER BY l.updated_at DESC LIMIT ?`,
    [...pf, batas]
  )) {
    const aksi =
      r.status === "revisi" ? "Perlu Revisi"
      : r.status === "diterima" ? "Laporan Diterima"
      : "Laporan";
    const detail =
      r.status === "terkirim"
        ? `${r.nama} mengunggah “${r.subjek}” v${r.versi}`
        : r.status === "revisi"
          ? `${r.nama}: “${r.subjek}” v${r.versi} perlu revisi`
          : r.status === "diterima"
            ? `${r.nama}: “${r.subjek}” v${r.versi} diterima pembimbing sekolah`
            : `${r.nama} menyusun “${r.subjek}”`;
    hasil.push({ id: `laporan:${r.ref}`, kategori: "laporan", aksi, detail, waktu: r.waktu });
  }

  for (const r of await all(
    `SELECT u.id AS ref, u.created_at AS waktu, s.nama AS nama, s.kelas AS kelas
     FROM users u JOIN siswa s ON s.id = u.siswa_id
     WHERE u.role = 'siswa'${sf} ORDER BY u.created_at DESC LIMIT ?`,
    [...pf, batas]
  )) {
    const kelas = r.kelas && r.kelas !== "Belum ditentukan" ? ` di ${r.kelas}` : "";
    hasil.push({
      id: `siswa:${r.ref}`,
      kategori: "siswa",
      aksi: "Siswa Baru",
      detail: `${r.nama} terdaftar${kelas}`,
      waktu: r.waktu,
    });
  }

  for (const r of await all(
    `SELECT d.id AS ref, d.created_at AS waktu, d.nama AS nama, d.kota AS kota
     FROM dudi d WHERE 1=1${dudiId ? " AND d.id = ?" : ""}
     ORDER BY d.created_at DESC LIMIT ?`,
    [...(dudiId ? [dudiId] : []), batas]
  )) {
    hasil.push({
      id: `mitra:${r.ref}`,
      kategori: "mitra",
      aksi: "Mitra DUDI",
      detail: `${r.nama} ditambahkan sebagai mitra${r.kota ? `, ${r.kota}` : ""}`,
      waktu: r.waktu,
    });
  }

  if (user.role !== "dudi") {
    for (const r of await all(
      `SELECT u.id AS ref, u.created_at AS waktu, u.nama AS nama
       FROM users u WHERE u.role = 'sekolah'
       ORDER BY u.created_at DESC LIMIT ?`,
      [batas]
    )) {
      hasil.push({
        id: `sekolah-akun:${r.ref}`,
        kategori: "akun-sekolah",
        aksi: "Akun Sekolah",
        detail: `${r.nama} mendapat akun pembimbing sekolah`,
        waktu: r.waktu,
      });
    }
  }

  hasil.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)));
  return hasil.slice(0, batas);
}

export function ringkasKosong() {
  return {
    jurnal: { ...rangkumStatus([]), bulan: rangkumStatus([]), periode: null },
    sparkline: [],
    siswa: { total: 0, aktif: 0 },
    laporan: { total: 0, draft: 0, terkirim: 0, revisi: 0, diterima: 0 },
    terbaru: [],
    kehadiran: { hadir: 0, hariKerja: 0, siswa: 0, persen: 0 },
    hariIni: { tanggal: iso(new Date()), sudah: 0, belum: 0, total: 0 },
    aktivitas: [],
  };
}

export async function absensiHadir(user, tahun, bulan) {
  const j = scope(user, "j");
  const sejak = `${tahun}-${pad(bulan)}-01`;
  const sampai = bulan === 12 ? `${tahun + 1}-01-01` : `${tahun}-${pad(bulan + 1)}-01`;
  const w = j.where
    ? `${j.where} AND j.status != 'ditolak' AND j.tanggal >= ? AND j.tanggal < ?`
    : ` WHERE j.status != 'ditolak' AND j.tanggal >= ? AND j.tanggal < ?`;
  const rows = await all(
    `SELECT j.siswa_id AS sid, j.tanggal AS t FROM jurnal j${j.join}${w}`,
    [...j.params, sejak, sampai]
  );
  return rows.map((r) => `${r.sid}|${r.t}`);
}

