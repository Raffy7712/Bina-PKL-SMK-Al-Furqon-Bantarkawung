import { DatabaseSync } from "node:sqlite";
import mysql from "mysql2/promise";

const berkas = process.env.PKL_DB_PATH ?? "data/pkl.db";
let sqlite;
try {
  sqlite = new DatabaseSync(berkas, { readOnly: true });
} catch (e) {
  console.error(`Tidak bisa membuka ${berkas}: ${e.message}`);
  process.exit(1);
}

const sql = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "pkl",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "pkl_dev",
  dateStrings: true,
});

const TABEL = [
  "dudi",
  "siswa",
  "kelas",
  "users",
  "jurnal",
  "laporan",
  "laporan_riwayat",
  "checkin",
  "berkas",
  "notifikasi",
  "pengaturan",
];

let beda = 0;

console.log("Jumlah baris\n");
console.log("tabel".padEnd(18), "sqlite".padStart(8), "mysql".padStart(8), " status");
for (const t of TABEL) {
  let nSqlite = null;
  try {
    nSqlite = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  } catch {
    console.log(t.padEnd(18), "       -", "       -", " tidak ada di SQLite");
    continue;
  }
  const [r] = await sql.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
  const nMy = Number(r[0].n);
  const sama = nSqlite === nMy;
  if (!sama) beda += 1;
  console.log(
    t.padEnd(18),
    String(nSqlite).padStart(8),
    String(nMy).padStart(8),
    sama ? " cocok" : ` BEDA (${nMy - nSqlite})`
  );
}

async function bandingkan(nama, kueri, kolom) {
  const a = sqlite.prepare(kueri).all().map((r) => kolom.map((k) => String(r[k] ?? "")).join("|"));
  const [rows] = await sql.query(kueri);
  const b = rows.map((r) => kolom.map((k) => String(r[k] ?? "")).join("|"));
  a.sort();
  b.sort();
  const sama = a.length === b.length && a.every((x, i) => x === b[i]);
  if (!sama) {
    beda += 1;
    const hilang = a.filter((x) => !b.includes(x)).slice(0, 3);
    console.log(`  BEDA ${nama}: ${a.length} vs ${b.length}`, hilang.length ? `contoh hilang: ${hilang[0]}` : "");
  } else {
    console.log(`  cocok ${nama} (${a.length} baris)`);
  }
}

console.log("\nIsi kunci");
await bandingkan("akun", "SELECT email, role, password FROM users", ["email", "role", "password"]);
await bandingkan("siswa", "SELECT id, nis, nama, kelas, dudi_id FROM siswa", ["id", "nis", "nama", "kelas", "dudi_id"]);
await bandingkan("mitra", "SELECT id, nama, radius_m FROM dudi", ["id", "nama", "radius_m"]);
await bandingkan("kelas", "SELECT nama FROM kelas", ["nama"]);
await bandingkan("jurnal", "SELECT id, siswa_id, tanggal, status FROM jurnal", ["id", "siswa_id", "tanggal", "status"]);
await bandingkan("notifikasi", "SELECT id, jenis, judul FROM notifikasi", ["id", "jenis", "judul"]);

await sql.end();

console.log(
  beda === 0
    ? "\nHASIL: semua tabel cocok. Arsip SQLite aman dihapus."
    : `\nHASIL: ${beda} perbedaan ditemukan. JANGAN hapus arsip SQLite dulu.`
);
process.exit(beda === 0 ? 0 : 1);
