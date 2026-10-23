import mysql from "mysql2/promise";
import { emailSiswa } from "./domain.js";
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const konfigurasi = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "pkl",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "pkl_dev",
  charset: "utf8mb4_unicode_ci",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL ?? 10),
  decimalNumbers: true,
  dateStrings: true,
};

const globalForDb = globalThis;

export const pool =
  globalForDb.__pklPool ?? (globalForDb.__pklPool = mysql.createPool(konfigurasi));

export const db = pool;

export async function all(sql, params = []) {
  await siap();
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  await siap();
  const [rows] = await pool.query(sql, params);
  return rows[0] ?? null;
}

export async function run(sql, params = []) {
  await siap();
  const [res] = await pool.execute(sql, params);
  return { changes: res.affectedRows ?? 0, insertId: res.insertId ?? 0 };
}

export async function transaksi(fn) {
  await siap();
  return transaksiKoneksi(fn);
}

async function transaksiKoneksi(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hasil = await fn(conn);
    await conn.commit();
    return hasil;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
    }
    throw e;
  } finally {
    conn.release();
  }
}

export function newId() {
  return randomUUID();
}

const DDL = [
  `CREATE TABLE IF NOT EXISTS dudi (
    id          VARCHAR(64)  NOT NULL PRIMARY KEY,
    nama        VARCHAR(160) NOT NULL,
    bidang      VARCHAR(120) NULL,
    alamat      VARCHAR(255) NULL,
    kota        VARCHAR(120) NULL,
    maps_url    VARCHAR(500) NULL,
    lat         DOUBLE       NULL,
    lng         DOUBLE       NULL,
    pembimbing  VARCHAR(160) NULL,
    kontak      VARCHAR(80)  NULL,
    jam         VARCHAR(80)  NULL,
    radius_m    INT          NOT NULL DEFAULT 100,
    tone        VARCHAR(40)  NOT NULL DEFAULT 'bg-marine',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS siswa (
    id       VARCHAR(64)  NOT NULL PRIMARY KEY,
    nis      VARCHAR(40)  NOT NULL,
    nama     VARCHAR(160) NOT NULL,
    kelas    VARCHAR(80)  NULL,
    telepon  VARCHAR(40)  NULL,
    status   VARCHAR(20)  NOT NULL DEFAULT 'aktif',
    dudi_id  VARCHAR(64)  NULL,
    UNIQUE KEY uq_siswa_nis (nis),
    KEY idx_siswa_dudi (dudi_id),
    CONSTRAINT fk_siswa_dudi FOREIGN KEY (dudi_id) REFERENCES dudi(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kelas (
    id          VARCHAR(64) NOT NULL PRIMARY KEY,
    nama        VARCHAR(80) NOT NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kelas_nama (nama)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(64)  NOT NULL PRIMARY KEY,
    nama         VARCHAR(160) NOT NULL,
    email        VARCHAR(190) NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         VARCHAR(20)  NOT NULL,
    siswa_id     VARCHAR(64)  NULL,
    dudi_id      VARCHAR(64)  NULL,
    google_sub   VARCHAR(190) NULL,
    google_email VARCHAR(190) NULL,
    username     VARCHAR(60)  NULL,
    foto         VARCHAR(190) NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_google_sub (google_sub),
    UNIQUE KEY uq_users_google_email (google_email),
    KEY idx_users_siswa (siswa_id),
    KEY idx_users_dudi (dudi_id),
    CONSTRAINT fk_users_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_users_dudi FOREIGN KEY (dudi_id) REFERENCES dudi(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_users_role CHECK (role IN ('siswa','dudi','sekolah','admin'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS jurnal (
    id                        VARCHAR(64)  NOT NULL PRIMARY KEY,
    siswa_id                  VARCHAR(64)  NOT NULL,
    tanggal                   DATE         NOT NULL,
    masuk                     VARCHAR(10)  NULL,
    keluar                    VARCHAR(10)  NULL,
    judul                     VARCHAR(200) NOT NULL,
    kegiatan                  TEXT         NULL,
    lampiran                  TEXT         NULL,
    status                    VARCHAR(24)  NOT NULL DEFAULT 'menunggu_dudi',
    catatan_dudi              TEXT         NULL,
    catatan_sekolah           TEXT         NULL,
    verifikasi_dudi_at        DATETIME     NULL,
    verifikasi_dudi_hasil     VARCHAR(20)  NULL,
    verifikasi_dudi_oleh      VARCHAR(160) NULL,
    verifikasi_sekolah_at     DATETIME     NULL,
    verifikasi_sekolah_hasil  VARCHAR(20)  NULL,
    verifikasi_sekolah_oleh   VARCHAR(160) NULL,
    created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_jurnal_siswa (siswa_id, tanggal),
    KEY idx_jurnal_status (status, tanggal),
    KEY idx_jurnal_tanggal (tanggal, siswa_id),
    KEY idx_jurnal_created (created_at),
    CONSTRAINT fk_jurnal_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS laporan (
    id          VARCHAR(64)  NOT NULL PRIMARY KEY,
    siswa_id    VARCHAR(64)  NOT NULL,
    judul       VARCHAR(200) NOT NULL,
    versi       INT          NOT NULL DEFAULT 1,
    status      VARCHAR(20)  NOT NULL DEFAULT 'draft',
    ukuran      VARCHAR(40)  NULL,
    halaman     INT          NULL,
    feedback    TEXT         NULL,
    jawaban     TEXT         NULL,
    penilaian   TEXT         NULL,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_laporan_siswa (siswa_id, status),
    KEY idx_laporan_status (status, updated_at),
    CONSTRAINT fk_laporan_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS laporan_riwayat (
    seq         BIGINT       NOT NULL AUTO_INCREMENT,
    id          VARCHAR(64)  NOT NULL PRIMARY KEY,
    laporan_id  VARCHAR(64)  NOT NULL,
    aksi        VARCHAR(20)  NOT NULL,
    oleh        VARCHAR(160) NOT NULL,
    peran       VARCHAR(20)  NOT NULL,
    catatan     TEXT         NULL,
    versi       INT          NULL,
    waktu       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_laporan_riwayat (laporan_id, waktu),
    UNIQUE KEY uq_riwayat_seq (seq),
    CONSTRAINT fk_riwayat_laporan FOREIGN KEY (laporan_id) REFERENCES laporan(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS checkin (
    id          VARCHAR(64) NOT NULL PRIMARY KEY,
    siswa_id    VARCHAR(64) NOT NULL,
    dudi_id     VARCHAR(64) NULL,
    lat         DOUBLE      NULL,
    lng         DOUBLE      NULL,
    jarak_m     DOUBLE      NULL,
    akurasi_m   DOUBLE      NULL,
    source      VARCHAR(20) NOT NULL DEFAULT 'gps',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_checkin_siswa (siswa_id, created_at),
    CONSTRAINT fk_checkin_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_checkin_dudi FOREIGN KEY (dudi_id) REFERENCES dudi(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS berkas (
    id          VARCHAR(64)  NOT NULL PRIMARY KEY,
    siswa_id    VARCHAR(64)  NOT NULL,
    jurnal_id   VARCHAR(64)  NULL,
    laporan_id  VARCHAR(64)  NULL,
    nama        VARCHAR(200) NOT NULL,
    mime        VARCHAR(120) NULL,
    ukuran      INT          NULL,
    path        VARCHAR(255) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_berkas_jurnal (jurnal_id),
    KEY idx_berkas_laporan (laporan_id),
    KEY idx_berkas_siswa (siswa_id),
    CONSTRAINT fk_berkas_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_berkas_jurnal FOREIGN KEY (jurnal_id) REFERENCES jurnal(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_berkas_laporan FOREIGN KEY (laporan_id) REFERENCES laporan(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifikasi (
    seq        BIGINT       NOT NULL AUTO_INCREMENT,
    id         VARCHAR(64)  NOT NULL PRIMARY KEY,
    user_id    VARCHAR(64)  NULL,
    jenis      VARCHAR(20)  NOT NULL DEFAULT 'sistem',
    judul      VARCHAR(160) NOT NULL,
    pesan      TEXT         NULL,
    tautan     VARCHAR(255) NULL,
    tujuan     VARCHAR(160) NULL,
    wa_nomor   VARCHAR(40)  NULL,
    wa_status  VARCHAR(20)  NULL,
    wa_error   TEXT         NULL,
    dibaca     TINYINT(1)   NOT NULL DEFAULT 0,
    dibuat     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notif_user (user_id, dibaca, dibuat),
    KEY idx_notif_dibuat (dibuat),
    UNIQUE KEY uq_notif_seq (seq),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pengaturan (
    kunci   VARCHAR(80)  NOT NULL PRIMARY KEY,
    nilai   TEXT         NOT NULL,
    diubah  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const MIGRASI = [
  "ALTER TABLE users ADD COLUMN username VARCHAR(60) NULL",
  "ALTER TABLE users ADD COLUMN foto VARCHAR(190) NULL",
  "ALTER TABLE users ADD UNIQUE KEY uq_users_username (username)",
];

const GALAT_SUDAH_ADA = new Set([
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_MULTIPLE_PRI_KEY",
]);

async function terapkanMigrasi() {
  for (const sql of MIGRASI) {
    try {
      await pool.query(sql);
    } catch (galat) {
      if (GALAT_SUDAH_ADA.has(galat?.code)) continue;
      throw galat;
    }
  }
}

function siapkan() {
  return (async () => {
    for (const sql of DDL) await pool.query(sql);
    await terapkanMigrasi();
    await seedIfEmpty();
    await adopsiKelas();
  })();
}

export function siap() {
  if (!globalForDb.__pklSiap) {
    globalForDb.__pklSiap = siapkan().catch((galat) => {
      globalForDb.__pklSiap = null;
      throw galat;
    });
  }
  return globalForDb.__pklSiap;
}

async function adopsiKelas() {
  await pool.query(
    `INSERT IGNORE INTO kelas (id, nama)
     SELECT UUID(), t.k FROM (
       SELECT DISTINCT TRIM(kelas) AS k FROM siswa
       WHERE kelas IS NOT NULL AND TRIM(kelas) <> '' AND TRIM(kelas) <> 'Belum ditentukan'
     ) t`
  );
}

async function seedIfEmpty() {
  if (process.env.PKL_SKIP_SEED === "1") return;
  const [ada] = await pool.query("SELECT COUNT(*) AS n FROM users");
  if (Number(ada[0].n) > 0) return;

  const [kunci] = await pool.query("SELECT GET_LOCK('pkl_seed', 15) AS ok");
  if (!kunci[0].ok) return;
  try {
    const [cek] = await pool.query("SELECT COUNT(*) AS n FROM users");
    if (Number(cek[0].n) > 0) return;

    await transaksiKoneksi(async (conn) => {
      const dudi = [
        ["d1", "PT Nusantara Digital", "Software House", "Jl. Ahmad Yani No. 120, Cibiru, Bandung", "Bandung", "", -6.9175, 107.6191, "Bagas Pratama", "0812-1100-4477", "07.30 – 16.30", "bg-marine"],
        ["d2", "CV Kreatif Media", "Digital Agency", "Jl. Soekarno-Hatta No. 45, Bandung", "Bandung", "", -6.9735, 107.6266, "Dewi Anggraini", "0857-9922-1010", "08.00 – 17.00", "bg-candy"],
        ["d3", "PT Sinar Teknik", "Manufaktur", "Kawasan Industri Cimahi, Blok C-7", "Cimahi", "", -6.8841, 107.5434, "Yusuf Maulana", "0813-2244-8080", "07.00 – 16.00", "bg-tang"],
        ["d4", "Bank Cahaya Sejahtera", "Perbankan", "Jl. Merdeka No. 8, Bandung", "Bandung", "", -6.9218, 107.6094, "Sinta Larasati", "0811-2233-5566", "08.00 – 15.30", "bg-mint"],
        ["d5", "Studio Arunika", "Graphic Design", "Jl. Riau No. 210, Bandung", "Bandung", "", -6.9034, 107.6182, "Raka Wijaya", "0819-3344-1212", "09.00 – 18.00", "bg-grape"],
        ["d6", "Apotek Sehat Bersama", "Kesehatan", "Jl. Antapani No. 55, Bandung", "Bandung", "", -6.9101, 107.6783, "apt. Nadia Putri", "0812-7788-9090", "08.00 – 21.00", "bg-sun"],
      ];
      for (const d of dudi) {
        await conn.query(
          `INSERT INTO dudi (id, nama, bidang, alamat, kota, maps_url, lat, lng, pembimbing, kontak, jam, tone)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          d
        );
      }

      const siswa = [
        ["s1", "2401001", "Alya Putri Ramadhani", "XII RPL 1", "aktif", "d1"],
        ["s2", "2401002", "Dimas Aryo Saputra", "XII RPL 1", "aktif", "d1"],
        ["s3", "2401003", "Nabila Zahra", "XII RPL 2", "aktif", "d2"],
        ["s4", "2401004", "Fajar Nugroho", "XII RPL 2", "aktif", "d3"],
        ["s5", "2401005", "Salsabila Ayu", "XII TKJ 1", "aktif", "d4"],
        ["s6", "2401006", "Rizky Ramadhan", "XII TKJ 1", "aktif", "d3"],
        ["s7", "2401007", "Intan Permata", "XII DKV 1", "aktif", "d5"],
        ["s8", "2401008", "Bagus Setiawan", "XII AKL 1", "aktif", "d6"],
        ["s9", "2401009", "Tri Lestari", "XII AKL 1", "pindah", "d4"],
        ["s10", "2401010", "Yoga Pratama", "XII RPL 1", "aktif", "d2"],
        ["s11", "2401011", "Kevin Alfarizi", "XII RPL 1", "aktif", "d1"],
      ];
      for (const s of siswa) {
        await conn.query(
          "INSERT INTO siswa (id, nis, nama, kelas, status, dudi_id) VALUES (?,?,?,?,?,?)",
          s
        );
      }

      const pengguna = [
        [randomUUID(), "Muhammad Raffi", "admin@its-raffy.my.id", hashPassword("admin123"), "admin", null, null],
        [randomUUID(), "Ibu Rina Wulandari, S.Kom", "rina@its-raffy.my.id", hashPassword("guru123"), "sekolah", null, null],
        [randomUUID(), "Bagas Pratama", "bagas@nusantara.id", hashPassword("dudi123"), "dudi", null, "d1"],
        [randomUUID(), "Dewi Anggraini", "dewi@kreatifmedia.id", hashPassword("dudi123"), "dudi", null, "d2"],
        [randomUUID(), "Yusuf Maulana", "yusuf@sintartik.id", hashPassword("dudi123"), "dudi", null, "d3"],
        [randomUUID(), "Sinta Larasati", "sinta@cahayabank.id", hashPassword("dudi123"), "dudi", null, "d4"],
        [randomUUID(), "Raka Wijaya", "raka@arunika.design", hashPassword("dudi123"), "dudi", null, "d5"],
        [randomUUID(), "apt. Nadia Putri", "nadia@apoteksehat.id", hashPassword("dudi123"), "dudi", null, "d6"],
      ];
      for (const [id, nis, nama] of siswa) {
        pengguna.push([
          randomUUID(),
          nama,
          emailSiswa(nis),
          hashPassword("siswa123"),
          "siswa",
          id,
          null,
        ]);
      }
      for (const u of pengguna) {
        await conn.query(
          "INSERT INTO users (id, nama, email, password, role, siswa_id, dudi_id) VALUES (?,?,?,?,?,?,?)",
          u
        );
      }

      const jurnal = [
        ["j1", "s1", "2026-10-14", "07:52", "16:30", "Integrasi API pembayaran", "Menghubungkan endpoint payment gateway ke dashboard kasir, menangani callback notifikasi, dan menulis unit test untuk alur transaksi gagal.", "screenshot-callback.png", "menunggu_dudi", null, null],
        ["j2", "s1", "2026-10-13", "07:58", "16:25", "Perbaikan bug form login", "Memperbaiki validasi form login yang salah menampilkan pesan error, menambahkan rate limit sederhana, dan request review ke mentor.", "diff-login.txt", "menunggu_sekolah", "Bagus, kode sudah rapi. Lanjutkan.", null],
        ["j3", "s1", "2026-10-12", "08:03", "16:10", "Desain komponen tabel data", "Membuat komponen tabel responsif di Figma lalu menerjemahkannya ke React + Tailwind.", "tabel-v2.png", "diterima", "Sesuai standar tim.", "Jurnal sudah lengkap. Pertahankan."],
        ["j4", "s1", "2026-10-09", "07:45", "16:35", "Riset kompetitor fitur absensi", "Mengumpulkan 5 aplikasi absensi kompetitor, membuat matriks perbandingan fitur, dan rekomendasi 3 ide fitur baru.", "matriks-kompetitor.pdf", "diterima", "Riset mendalam.", "Bagus, analisisnya terstruktur."],
        ["j5", "s1", "2026-10-08", "08:11", "16:02", "Setup environment deployment", "Mengonfigurasi CI/CD sederhana, environment staging, dan deploy pertama kali ke server.", "log-deploy.txt", "diterima", "Deploy lancar.", "Oke."],
        ["j6", "s1", "2026-10-07", "07:50", "16:20", "Diskusi sprint & pembagian task", "Ikut meeting harian, mengambil task pembuatan halaman laporan, dan memecah task menjadi sub-task kecil.", "", "ditolak", "Lampiran bukti belum ada, tolong dilengkapi.", null],
        ["j7", "s2", "2026-10-14", "07:57", "16:15", "Migrasi database tabel order", "Menulis skrip migrasi, menjalankan di staging, dan membandingkan hasil row count.", "migrasi-v3.sql", "menunggu_dudi", null, null],
        ["j8", "s2", "2026-10-13", "08:00", "16:05", "Review kode junior", "Me-review 3 pull request junior developer dan memberikan komentar perbaikan.", "review.md", "menunggu_sekolah", "Catatan review tajam, bagus.", null],
        ["j9", "s3", "2026-10-14", "07:49", "16:40", "Konten media sosial klien", "Membuat 4 desain konten Instagram, menulis caption, dan menjadwalkan posting.", "konten-ig.zip", "menunggu_dudi", null, null],
        ["j10", "s3", "2026-10-13", "07:55", "16:22", "Revisi brand guideline", "Menyesuaikan warna dan tipografi sesuai feedback klien.", "guideline-v2.pdf", "diterima", "Sesuai brief.", "Terstruktur."],
        ["j11", "s4", "2026-10-14", "07:05", "16:00", "Pemeriksaan mesin CNC", "Melakukan kalibrasi sumbu X, mencatat hasil di checklist harian, dan membersihkan area kerja.", "checklist-cnc.jpg", "menunggu_dudi", null, null],
        ["j12", "s4", "2026-10-13", "07:02", "16:10", "Penyusunan laporan produksi", "Menginput data hasil produksi mingguan ke spreadsheet dan membuat grafik.", "produksi-mgu41.xlsx", "menunggu_sekolah", "Data akurat.", null],
        ["j13", "s5", "2026-10-13", "08:04", "15:50", "Konseling obat pasien", "Membantu informasi obat sesuai resep dan menjelaskan aturan pakai kepada pasien.", "log-konseling.pdf", "diterima", "Komunikasi jelas.", "Sesuai etika profesi."],
        ["j14", "s7", "2026-10-14", "09:02", "18:05", "Konsep poster event musik", "Membuat 3 alternatif konsep poster dan presentasi ke art director.", "poster-konsep.zip", "menunggu_dudi", null, null],
        ["j15", "s7", "2026-10-12", "09:00", "18:00", "Ilustrasi aset karakter", "Menggambar aset karakter untuk animasi promosi, finalisasi warna.", "aset-karakter.png", "diterima", null, "Kreatif."],
        ["j16", "s11", "2026-10-14", "07:54", "16:28", "Dashboard laporan penjualan", "Membuat chart grafik penjualan bulanan dan menyambungkan filter tanggal ke API mock.", "dashboard-v1.png", "menunggu_dudi", null, null],
        ["j17", "s11", "2026-10-13", "07:51", "16:33", "Onboarding proyek baru", "Membaca dokumentasi kodebase, menjalankan aplikasi lokal, dan mencatat istilah bisnis.", "catatan-onboarding.md", "diterima", "Selamat bergabung, jaga konsistensi.", "Pembiasaan diri yang baik."],
      ];
      for (const j of jurnal) {
        await conn.query(
          `INSERT INTO jurnal (id, siswa_id, tanggal, masuk, keluar, judul, kegiatan, lampiran, status, catatan_dudi, catatan_sekolah)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          j
        );
      }

      const laporan = [
        ["l1", "s1", "Laporan Akhir PKL, Pengembangan Web Kasir", 2, "revisi", "4.2 MB", 48, "Tambahkan landasan teori & lampiran screenshot hasil uji coba.", "2026-10-11 09:00:00", null],
        ["l2", "s1", "Laporan Mingguan #3", 1, "terkirim", "1.1 MB", 12, "", "2026-10-13 09:00:00", null],
        ["l3", "s1", "Laporan Mingguan #2", 1, "diterima", "980 KB", 10, "Isi sudah lengkap, bahasa rapi.", "2026-10-06 13:10:00", '{"isi":88,"format":85,"analisis":90,"presentasi":82}'],
        ["l4", "s2", "Laporan Akhir PKL, Migrasi Sistem", 1, "terkirim", "3.7 MB", 44, "", "2026-10-12 10:00:00", null],
        ["l5", "s3", "Laporan Akhir PKL, Kampanye Digital", 3, "diterima", "6.0 MB", 62, "Kerja bagus, siap dipresentasikan.", "2026-10-09 14:00:00", '{"isi":90,"format":88,"analisis":92,"presentasi":86}'],
        ["l6", "s4", "Laporan Mingguan #4", 1, "draft", "640 KB", 8, "", "2026-10-14 08:00:00", null],
      ];
      for (const l of laporan) {
        await conn.query(
          `INSERT INTO laporan (id, siswa_id, judul, versi, status, ukuran, halaman, feedback, updated_at, penilaian)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          l
        );
      }

      const riwayat = [
        ["rl1", "l1", "kirim", "Alya Putri Ramadhani", "siswa", null, 1, "2026-10-05 09:15:00"],
        ["rl2", "l1", "revisi", "Ibu Rina Wulandari, S.Kom", "sekolah", "Tambahkan landasan teori & lampiran screenshot hasil uji coba.", 1, "2026-10-08 10:20:00"],
        ["rl3", "l1", "revisi", "Alya Putri Ramadhani", "siswa", null, 2, "2026-10-11 08:40:00"],
        ["rl4", "l2", "kirim", "Alya Putri Ramadhani", "siswa", null, 1, "2026-10-13 09:05:00"],
        ["rl5", "l3", "kirim", "Alya Putri Ramadhani", "siswa", null, 1, "2026-10-02 08:50:00"],
        ["rl6", "l3", "terima", "Ibu Rina Wulandari, S.Kom", "sekolah", "Isi sudah lengkap, bahasa rapi.", 1, "2026-10-06 13:10:00"],
        ["rl7", "l4", "kirim", "Dimas Aryo Saputra", "siswa", null, 1, "2026-10-12 10:00:00"],
        ["rl8", "l5", "kirim", "Nabila Zahra", "siswa", null, 1, "2026-09-20 09:00:00"],
        ["rl9", "l5", "revisi", "Ibu Rina Wulandari, S.Kom", "sekolah", "Perkuat data kampanye.", 1, "2026-09-24 11:00:00"],
        ["rl10", "l5", "revisi", "Nabila Zahra", "siswa", null, 2, "2026-09-28 08:30:00"],
        ["rl11", "l5", "terima", "Ibu Rina Wulandari, S.Kom", "sekolah", "Kerja bagus, siap dipresentasikan.", 3, "2026-10-09 14:00:00"],
      ];
      for (const r of riwayat) {
        await conn.query(
          `INSERT INTO laporan_riwayat (id, laporan_id, aksi, oleh, peran, catatan, versi, waktu)
           VALUES (?,?,?,?,?,?,?,?)`,
          r
        );
      }
    });
  } finally {
    await pool.query("SELECT RELEASE_LOCK('pkl_seed')");
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `s2$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split("$");
    if (algo !== "s2" || !salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
