import { DatabaseSync } from "node:sqlite";
import mysql from "mysql2/promise";

const sumber = process.env.PKL_DB_PATH ?? "data/pkl.db";
const sqlite = new DatabaseSync(sumber, { readOnly: true });

const mysqlConn = await mysql.createConnection({
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

function kolomSqlite(tabel) {
  return sqlite.prepare(`PRAGMA table_info(${tabel})`).all().map((k) => k.name);
}

function kolomMysql(tabel) {
  return mysqlConn
    .query(`SELECT COLUMN_NAME AS nama FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`, [tabel])
    .then(([r]) => r.map((x) => x.nama));
}

let total = 0;
for (const tabel of TABEL) {
  let baris = [];
  try {
    baris = sqlite.prepare(`SELECT * FROM ${tabel}`).all();
  } catch {
    console.log(`${tabel}: tidak ada di SQLite, dilewati`);
    continue;
  }
  if (!baris.length) {
    console.log(`${tabel}: kosong`);
    continue;
  }

  const adaMySQL = new Set(await kolomMysql(tabel));
  const adaSQLite = new Set(kolomSqlite(tabel));
  const kolom = [...adaSQLite].filter((k) => adaMySQL.has(k) && k !== "seq");
  if (!kolom.length) {
    console.log(`${tabel}: tidak ada kolom yang cocok, dilewati`);
    continue;
  }

  const sql = `INSERT IGNORE INTO ${tabel} (${kolom.map((k) => `\`${k}\``).join(",")})
               VALUES (${kolom.map(() => "?").join(",")})`;
  let masuk = 0;
  for (const r of baris) {
    const nilai = kolom.map((k) => {
      const v = r[k];
      if (v === undefined) return null;
      return v;
    });
    const [res] = await mysqlConn.execute(sql, nilai);
    masuk += res.affectedRows ?? 0;
  }
  total += masuk;
  console.log(`${tabel}: ${masuk} dari ${baris.length} baris diimpor`);
}

console.log(`\nSelesai. Total baris masuk: ${total}`);
await mysqlConn.end();
