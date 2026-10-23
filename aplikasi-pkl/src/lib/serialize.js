import { one, all, run, newId } from "./db";
import { mapsLinkFromCoords } from "./geocode";
import { rataPenilaian } from "./nilai";

export function serializeJurnal(row) {
  if (!row) return null;
  return {
    id: row.id,
    siswaId: row.siswa_id,
    siswaNama: row.siswa_nama ?? null,
    siswaKelas: row.siswa_kelas ?? null,
    dudiId: row.dudi_id ?? null,
    dudiNama: row.dudi_nama ?? null,
    tanggal: row.tanggal,
    masuk: row.masuk,
    keluar: row.keluar,
    judul: row.judul,
    kegiatan: row.kegiatan,
    lampiran: row.lampiran ?? "",
    lampiranList: String(row.lampiran ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    status: row.status,
    catatanDudi: row.catatan_dudi ?? "",
    catatanSekolah: row.catatan_sekolah ?? "",
    dibuat: row.created_at ?? null,
    verifikasiDudiAt: row.verifikasi_dudi_at ?? null,
    verifikasiDudiHasil: row.verifikasi_dudi_hasil ?? null,
    verifikasiDudiOleh: row.verifikasi_dudi_oleh ?? null,
    verifikasiSekolahAt: row.verifikasi_sekolah_at ?? null,
    verifikasiSekolahHasil: row.verifikasi_sekolah_hasil ?? null,
    verifikasiSekolahOleh: row.verifikasi_sekolah_oleh ?? null,
  };
}

export function serializeSiswa(row) {
  if (!row) return null;
  return {
    id: row.id,
    nis: row.nis,
    nama: row.nama,
    kelas: row.kelas,
    telepon: row.telepon ?? "",
    status: row.status,
    dudiId: row.dudi_id ?? null,
    dudiNama: row.dudi_nama ?? null,
    fotoUrl: row.akun_foto
      ? `/api/akun/foto/lihat?u=${encodeURIComponent(row.akun_id)}&v=${encodeURIComponent(row.akun_foto)}`
      : null,
    akun: row.akun_id
      ? {
          id: row.akun_id,
          googleEmail: row.akun_google ?? null,
          fotoUrl: row.akun_foto
            ? `/api/akun/foto/lihat?u=${encodeURIComponent(row.akun_id)}&v=${encodeURIComponent(row.akun_foto)}`
            : null,
        }
      : null,
  };
}

export function serializeNotifikasi(row) {
  if (!row) return null;
  return {
    id: row.id,
    jenis: row.jenis,
    judul: row.judul,
    pesan: row.pesan ?? "",
    tautan: row.tautan ?? null,
    tujuan: row.tujuan ?? row.user_nama ?? null,
    waNomor: row.wa_nomor ?? null,
    waStatus: row.wa_status ?? null,
    waError: row.wa_error ?? null,
    dibaca: !!row.dibaca,
    dibuat: row.dibuat,
  };
}

const TONES = ["bg-marine", "bg-candy", "bg-tang", "bg-mint", "bg-grape", "bg-sun"];

export function serializeDudi(row) {
  if (!row) return null;
  const lat = row.lat ?? null;
  const lng = row.lng ?? null;
  return {
    id: row.id,
    nama: row.nama,
    bidang: row.bidang ?? "",
    alamat: row.alamat ?? "",
    kota: row.kota ?? "",
    koordinat: lat != null && lng != null ? `${lat}, ${lng}` : "",
    lat,
    lng,
    pembimbing: row.pembimbing ?? "",
    kontak: row.kontak ?? "",
    jam: row.jam ?? "",
    radiusM: row.radius_m ?? 100,
    tone: row.tone ?? TONES[0],
    maps: row.maps_url || mapsLinkFromCoords(lat, lng),
    mapsUrl: row.maps_url || mapsLinkFromCoords(lat, lng),
    jmlSiswa: row.jml_siswa ?? 0,
    jmlAkun: row.jml_akun ?? 0,
    akun: row.akun_id
      ? {
          id: row.akun_id,
          email: row.akun_email ?? "",
          googleEmail: row.akun_google ?? null,
        }
      : null,
  };
}

export function serializeLaporan(row) {
  if (!row) return null;
  const penilaian = parsePenilaian(row.penilaian);
  return {
    id: row.id,
    siswaId: row.siswa_id,
    siswaNama: row.siswa_nama ?? null,
    judul: row.judul,
    versi: row.versi,
    status: row.status,
    ukuran: row.ukuran ?? "",
    halaman: row.halaman ?? null,
    diperbarui: String(row.updated_at ?? "").slice(0, 10),
    feedback: row.feedback ?? "",
    jawaban: row.jawaban ?? "",
    penilaian,
    nilaiAkhir: rataPenilaian(penilaian),
  };
}

function parsePenilaian(raw) {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v;
  } catch {
    return null;
  }
}

export function serializeRiwayatLaporan(row) {
  if (!row) return null;
  return {
    id: row.id,
    aksi: row.aksi,
    oleh: row.oleh,
    peran: row.peran,
    catatan: row.catatan ?? "",
    versi: row.versi ?? null,
    waktu: row.waktu,
  };
}

export async function listRiwayatLaporan(laporanId) {
  return (
    await all(
      `SELECT * FROM laporan_riwayat WHERE laporan_id = ? ORDER BY waktu ASC, seq ASC`,
      [laporanId]
    )
  ).map(serializeRiwayatLaporan);
}

export async function catatRiwayatLaporan(
  laporanId,
  { aksi, oleh, peran, catatan = null, versi = null }
) {
  await run(
    `INSERT INTO laporan_riwayat (id, laporan_id, aksi, oleh, peran, catatan, versi)
     VALUES (?,?,?,?,?,?,?)`,
    [newId(), laporanId, aksi, oleh, peran, catatan, versi]
  );
}

const JURNAL_SELECT = `
  SELECT j.*, s.nama AS siswa_nama, s.kelas AS siswa_kelas, s.dudi_id AS dudi_id,
         d.nama AS dudi_nama
  FROM jurnal j
  JOIN siswa s ON s.id = j.siswa_id
  LEFT JOIN dudi d ON d.id = s.dudi_id
`;

export const STATUS_VALID = ["menunggu_dudi", "menunggu_sekolah", "diterima", "ditolak"];
export const LAPORAN_STATUS_VALID = ["draft", "terkirim", "revisi", "diterima"];

function statusList(status, valid = STATUS_VALID) {
  const arr = Array.isArray(status) ? status : String(status ?? "").split(",");
  return arr.map((s) => s.trim()).filter((s) => valid.includes(s));
}

function jurnalWhere({ siswaId, dudiId, status, tanggal, sejak, sampai } = {}) {
  const where = [];
  const params = [];
  if (siswaId) {
    where.push("j.siswa_id = ?");
    params.push(siswaId);
  }
  if (dudiId) {
    where.push("s.dudi_id = ?");
    params.push(dudiId);
  }
  const st = statusList(status);
  if (st.length) {
    where.push(`j.status IN (${st.map(() => "?").join(",")})`);
    params.push(...st);
  }
  if (tanggal) {
    where.push("j.tanggal = ?");
    params.push(tanggal);
  }
  if (sejak) {
    where.push("j.tanggal >= ?");
    params.push(sejak);
  }
  if (sampai) {
    where.push("j.tanggal <= ?");
    params.push(sampai);
  }
  return {
    where: where.length ? ` WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

export async function listJurnal({
  siswaId, dudiId, status, tanggal, sejak, sampai, limit, offset,
} = {}) {
  const { where, params } = jurnalWhere({ siswaId, dudiId, status, tanggal, sejak, sampai });
  let sql = JURNAL_SELECT + where + " ORDER BY j.tanggal DESC, j.created_at DESC";
  const p = [...params];
  if (limit != null) {
    sql += " LIMIT ? OFFSET ?";
    p.push(limit, Math.max(0, offset || 0));
  }
  return (await all(sql, p)).map(serializeJurnal);
}

export async function countJurnal(filters = {}) {
  const { where, params } = jurnalWhere(filters);
  const row = await one(
    `SELECT COUNT(*) AS n FROM jurnal j JOIN siswa s ON s.id = j.siswa_id${where}`,
    params
  );
  return row?.n ?? 0;
}

export async function getJurnal(id) {
  return serializeJurnal(await one(`${JURNAL_SELECT} WHERE j.id = ?`, [id]));
}

export async function listLaporan({ siswaId, dudiId, status, limit, offset } = {}) {
  const where = [];
  const params = [];
  if (siswaId) {
    where.push("l.siswa_id = ?");
    params.push(siswaId);
  }
  if (dudiId) {
    where.push("s.dudi_id = ?");
    params.push(dudiId);
  }
  const st = statusList(status, LAPORAN_STATUS_VALID);
  if (st.length) {
    where.push(`l.status IN (${st.map(() => "?").join(",")})`);
    params.push(...st);
  }
  let sql = `
    SELECT l.*, s.nama AS siswa_nama
    FROM laporan l JOIN siswa s ON s.id = l.siswa_id`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY l.updated_at DESC";
  if (limit != null) {
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, Math.max(0, offset || 0));
  }
  return (await all(sql, params)).map(serializeLaporan);
}

export async function countLaporan({ siswaId, dudiId, status } = {}) {
  const where = [];
  const params = [];
  if (siswaId) {
    where.push("l.siswa_id = ?");
    params.push(siswaId);
  }
  if (dudiId) {
    where.push("s.dudi_id = ?");
    params.push(dudiId);
  }
  const st = statusList(status, LAPORAN_STATUS_VALID);
  if (st.length) {
    where.push(`l.status IN (${st.map(() => "?").join(",")})`);
    params.push(...st);
  }
  const row = await one(
    `SELECT COUNT(*) AS n FROM laporan l JOIN siswa s ON s.id = l.siswa_id${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
    params
  );
  return row?.n ?? 0;
}

export async function listSiswa({ dudiId, statsBulan } = {}) {
  return (await querySiswa({ dudiId, statsBulan })).map(serializeSiswa);
}

export async function statsSiswa({ dudiId, statsBulan } = {}) {
  return statsDari(await querySiswa({ dudiId, statsBulan }));
}

async function querySiswa({ dudiId, statsBulan } = {}) {
  const where = [];
  const wParams = [];
  if (dudiId) {
    where.push("s.dudi_id = ?");
    wParams.push(dudiId);
  }
  const sSel = statsBulan
    ? `, COUNT(j.id) AS st_jml,
       COALESCE(SUM(j.status != 'ditolak'), 0) AS st_hadir,
       COALESCE(SUM(j.status = 'diterima'), 0) AS st_diterima,
       MIN(j.tanggal) AS st_mulai,
       COALESCE(SUM(j.status != 'ditolak' AND j.tanggal >= ? AND j.tanggal < ?), 0) AS st_bulan`
    : "";
  const sParams = statsBulan ? [...statsBulan] : [];
  let sql = `
    SELECT s.*, d.nama AS dudi_nama,
           (SELECT u.id FROM users u WHERE u.siswa_id = s.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_id,
           (SELECT u.google_email FROM users u WHERE u.siswa_id = s.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_google,
           (SELECT u.foto FROM users u WHERE u.siswa_id = s.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_foto${sSel}
    FROM siswa s LEFT JOIN dudi d ON d.id = s.dudi_id` +
    (statsBulan ? " LEFT JOIN jurnal j ON j.siswa_id = s.id" : "");
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  if (statsBulan) sql += " GROUP BY s.id";
  sql += " ORDER BY s.nama";
  return await all(sql, [...sParams, ...wParams]);
}

function statsDari(rows) {
  const out = {};
  for (const r of rows) {
    if (!("st_jml" in r)) continue;
    out[r.id] = {
      jml: r.st_jml ?? 0,
      hadir: r.st_hadir ?? 0,
      diterima: r.st_diterima ?? 0,
      mulai: r.st_mulai ?? null,
      bulan: r.st_bulan ?? 0,
    };
  }
  return out;
}

export async function listDudi({ id } = {}) {
  const sql = `
    SELECT d.*,
           (SELECT COUNT(*) FROM siswa s WHERE s.dudi_id = d.id) AS jml_siswa,
           (SELECT COUNT(*) FROM users u WHERE u.dudi_id = d.id) AS jml_akun,
           (SELECT u.id FROM users u WHERE u.dudi_id = d.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_id,
           (SELECT u.email FROM users u WHERE u.dudi_id = d.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_email,
           (SELECT u.google_email FROM users u WHERE u.dudi_id = d.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_google,
           (SELECT u.foto FROM users u WHERE u.dudi_id = d.id ORDER BY u.created_at, u.id LIMIT 1) AS akun_foto
    FROM dudi d
    ${id ? "WHERE d.id = ?" : ""}
    ORDER BY d.nama`;
  const rows = id ? await all(sql, [id]) : await all(sql);
  return rows.map(serializeDudi);
}
