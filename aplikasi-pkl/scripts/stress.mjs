#!/usr/bin/env node
import mysql from "mysql2/promise";
import { DOMAIN_EMAIL } from "../src/lib/domain.js";

const NAMA_DB = process.env.DB_NAME_STRESS ?? "pkl_stress";
const koneksi = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "pkl",
  password: process.env.DB_PASSWORD ?? "",
};

const akar = await mysql.createConnection(koneksi);
const [adaDb] = await akar.query("SHOW DATABASES LIKE ?", [NAMA_DB]);
await akar.end();
if (!adaDb.length) {
  console.error(
    [
      `Database "${NAMA_DB}" belum ada.`,
      "Buat sekali dengan hak admin MySQL:",
      "",
      `  sudo mariadb -e "CREATE DATABASE ${NAMA_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON ${NAMA_DB}.* TO '${koneksi.user}'@'localhost'; FLUSH PRIVILEGES;"`,
      "",
      "Lalu jalankan ulang: npm run db:stress",
    ].join("\n")
  );
  process.exit(1);
}
console.log(`Database: ${NAMA_DB}`);

process.env.DB_NAME = NAMA_DB;
process.env.PKL_SKIP_SEED = "1";
const { siap, transaksi, pool, hashPassword } = await import(
  new URL("../src/lib/db.js", import.meta.url).href
);
await siap();

async function sisip(conn, tabel, kolom, baris, perBatch = 500) {
  for (let i = 0; i < baris.length; i += perBatch) {
    const potong = baris.slice(i, i + perBatch);
    const tanda = potong
      .map(() => `(${kolom.map(() => "?").join(",")})`)
      .join(",");
    await conn.query(
      `INSERT INTO ${tabel} (${kolom.join(",")}) VALUES ${tanda}`,
      potong.flat()
    );
  }
}

const N_SISWA = 200;

const HARI = [];
for (
  let d = new Date(2026, 5, 1);
  d <= new Date(2026, 9, 14);
  d.setDate(d.getDate() + 1)
) {
  const g = d.getDay();
  if (g === 0 || g === 6) continue;
  HARI.push(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`
  );
}

const dudi = [
  ["d1", "PT Nusantara Digital", "Software House"],
  ["d2", "CV Kreatif Media", "Digital Agency"],
  ["d3", "PT Sinar Teknik", "Manufaktur"],
  ["d4", "Bank Cahaya Sejahtera", "Perbankan"],
  ["d5", "Studio Arunika", "Graphic Design"],
  ["d6", "Apotek Sehat Bersama", "Kesehatan"],
];

const kelas = ["XII RPL 1", "XII RPL 2", "XII TKJ 1", "XII DKV 1", "XII AKL 1"];
const judulJurnal = [
  "Integrasi API pembayaran",
  "Perbaikan bug form login",
  "Desain komponen tabel data",
  "Riset kompetitor",
  "Setup environment deployment",
  "Review kode junior",
];

await transaksi(async (conn) => {
  for (const t of [
    "berkas",
    "checkin",
    "laporan_riwayat",
    "laporan",
    "jurnal",
    "notifikasi",
    "users",
    "siswa",
    "dudi",
  ]) {
    await conn.query(`DELETE FROM \`${t}\``);
  }

  await sisip(
    conn,
    "dudi",
    ["id", "nama", "bidang", "kota", "lat", "lng", "tone"],
    dudi.map(([id, nama, bidang]) => [id, nama, bidang, "Bandung", -6.92, 107.61, "bg-marine"])
  );

  const siswaIds = [];
  const barisSiswa = [];
  for (let i = 1; i <= N_SISWA; i++) {
    const id = `sx${i}`;
    siswaIds.push(id);
    barisSiswa.push([
      id,
      String(2409000 + i),
      `Praktikan Stress ${String(i).padStart(3, "0")}`,
      kelas[i % kelas.length],
      i % 40 === 0 ? "pindah" : "aktif",
      dudi[i % dudi.length][0],
    ]);
  }
  await sisip(conn, "siswa", ["id", "nis", "nama", "kelas", "status", "dudi_id"], barisSiswa);

  const hAdmin = hashPassword("admin123");
  const hGuru = hashPassword("guru123");
  const hDudi = hashPassword("dudi123");
  const hSiswa = hashPassword("siswa123");
  const barisUser = [
    ["u-admin", "Admin", "admin@its-raffy.my.id", hAdmin, "admin", null, null],
    ["u-sekolah", "Pembimbing Sekolah", "rina@its-raffy.my.id", hGuru, "sekolah", null, null],
    ["u-d1", "Bagas", "bagas@nusantara.id", hDudi, "dudi", null, "d1"],
    ["u-d2", "Dewi", "dewi@kreatifmedia.id", hDudi, "dudi", null, "d2"],
    ["u-d3", "Yusuf", "yusuf@sintartik.id", hDudi, "dudi", null, "d3"],
    ["u-d4", "Sinta", "sinta@cahayabank.id", hDudi, "dudi", null, "d4"],
    ["u-d5", "Raka", "raka@arunika.design", hDudi, "dudi", null, "d5"],
    ["u-d6", "Nadia", "nadia@apoteksehat.id", hDudi, "dudi", null, "d6"],
  ];
  siswaIds.forEach((sid, i) => {
    barisUser.push([
      `u-${sid}`,
      `Praktikan Stress ${String(i + 1).padStart(3, "0")}`,
      `${2409000 + i + 1}@${DOMAIN_EMAIL}`,
      hSiswa,
      "siswa",
      sid,
      null,
    ]);
  });
  await sisip(
    conn,
    "users",
    ["id", "nama", "email", "password", "role", "siswa_id", "dudi_id"],
    barisUser
  );

  const barisJurnal = [];
  const akhirIdx = HARI.length - 1;
  siswaIds.forEach((sid, si) => {
    HARI.forEach((tgl, hi) => {
      const r = (si * 31 + hi * 7) % 100;
      let status;
      if (hi >= akhirIdx - 2) {
        status =
          r < 45 ? "menunggu_dudi" : r < 70 ? "menunggu_sekolah" : r < 90 ? "diterima" : "ditolak";
      } else {
        status =
          r < 85 ? "diterima" : r < 93 ? "menunggu_sekolah" : r < 97 ? "menunggu_dudi" : "ditolak";
      }
      barisJurnal.push([
        `j-${si}-${hi}`,
        sid,
        tgl,
        "07:50",
        "16:20",
        `${judulJurnal[hi % judulJurnal.length]} #${hi}`,
        "Kegiatan praktik kerja lapangan sesuai jadwal harian.",
        status,
        `${tgl} 16:30:00`,
      ]);
    });
  });
  await sisip(
    conn,
    "jurnal",
    ["id", "siswa_id", "tanggal", "masuk", "keluar", "judul", "kegiatan", "status", "created_at"],
    barisJurnal,
    500
  );

  const barisLaporan = [];
  siswaIds.forEach((sid, i) => {
    for (let v = 1; v <= 2; v++) {
      const st = ["draft", "terkirim", "revisi", "diterima"][(i + v) % 4];
      barisLaporan.push([
        `l-${i}-${v}`,
        sid,
        v === 1 ? `Laporan Mingguan #${i}` : `Laporan Akhir PKL ${i}`,
        v,
        st,
        "2.1 MB",
        12,
        `2026-10-${String((i % 14) + 1).padStart(2, "0")} 09:00:00`,
      ]);
    }
  });
  await sisip(
    conn,
    "laporan",
    ["id", "siswa_id", "judul", "versi", "status", "ukuran", "halaman", "updated_at"],
    barisLaporan
  );

  const barisCheckin = [];
  const recent = HARI.slice(-60);
  siswaIds.forEach((sid, si) => {
    const dudiId = dudi[si % dudi.length][0];
    recent.forEach((tgl, k) => {
      if ((si + k) % 7 === 0) return;
      barisCheckin.push([`c-${si}-${k}`, sid, dudiId, -6.92, 107.61, "gps", `${tgl} 07:45:00`]);
    });
  });
  await sisip(
    conn,
    "checkin",
    ["id", "siswa_id", "dudi_id", "lat", "lng", "source", "created_at"],
    barisCheckin
  );

  console.log(
    `isi: ${N_SISWA} siswa · ${barisJurnal.length} jurnal · ${barisLaporan.length} laporan · ${barisCheckin.length} check-in · ${HARI.length} hari kerja`
  );
});

await pool.end();
console.log(`Selesai. Jalankan: DB_NAME=${NAMA_DB} npx next start -p 3200`);
