import mysql from "mysql2/promise";

const nama = process.env.DB_NAME ?? "pkl_dev";
if (!/^pkl_[a-z0-9_]+$/i.test(nama)) {
  console.error(`Nama database "${nama}" tidak aman untuk dihapus. Batalkan.`);
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "pkl",
  password: process.env.DB_PASSWORD ?? "",
});

await conn.query(`DROP DATABASE IF EXISTS \`${nama}\``);
await conn.query(
  `CREATE DATABASE \`${nama}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
);
await conn.end();
console.log(`Database ${nama} dibuat ulang.`);

const db = await import("../src/lib/db.js");
await db.siap();
const user = await db.one("SELECT COUNT(*) AS n FROM users");
console.log(`Skema siap. Akun awal: ${user.n}`);
await db.pool.end();
