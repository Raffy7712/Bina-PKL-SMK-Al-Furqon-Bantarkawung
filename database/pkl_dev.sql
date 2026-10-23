/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.20-11.8.9-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: pkl_dev
-- ------------------------------------------------------
-- Server version	11.8.9-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `berkas`
--

DROP TABLE IF EXISTS `berkas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `berkas` (
  `id` varchar(64) NOT NULL,
  `siswa_id` varchar(64) NOT NULL,
  `jurnal_id` varchar(64) DEFAULT NULL,
  `laporan_id` varchar(64) DEFAULT NULL,
  `nama` varchar(200) NOT NULL,
  `mime` varchar(120) DEFAULT NULL,
  `ukuran` int(11) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_berkas_jurnal` (`jurnal_id`),
  KEY `idx_berkas_laporan` (`laporan_id`),
  KEY `idx_berkas_siswa` (`siswa_id`),
  CONSTRAINT `fk_berkas_jurnal` FOREIGN KEY (`jurnal_id`) REFERENCES `jurnal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_berkas_laporan` FOREIGN KEY (`laporan_id`) REFERENCES `laporan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_berkas_siswa` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `berkas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `berkas` DISABLE KEYS */;
INSERT INTO `berkas` VALUES
('73da8e2d-01f6-41b7-b5ce-fc49161a8fd9','cf5036ec-1f99-47d5-88f4-52c60b04dbe2','c2a3db22-b31d-4f93-ae32-e221aa789432',NULL,'Buku agenda surat.xlsx','application/wps-office.xlsx',18023,'73da8e2d-01f6-41b7-b5ce-fc49161a8fd9.xlsx','2026-10-23 00:22:21'),
('ea06daed-d97a-4264-9e14-ecc3b83f6ade','cf5036ec-1f99-47d5-88f4-52c60b04dbe2',NULL,'82bb90f4-dccd-42af-b311-a97194a5f46c','BUKU TAMU.xlsx','application/wps-office.xlsx',12071,'ea06daed-d97a-4264-9e14-ecc3b83f6ade.xlsx','2026-10-22 23:43:31');
/*!40000 ALTER TABLE `berkas` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `checkin`
--

DROP TABLE IF EXISTS `checkin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin` (
  `id` varchar(64) NOT NULL,
  `siswa_id` varchar(64) NOT NULL,
  `dudi_id` varchar(64) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `jarak_m` double DEFAULT NULL,
  `akurasi_m` double DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'gps',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_checkin_siswa` (`siswa_id`,`created_at`),
  KEY `fk_checkin_dudi` (`dudi_id`),
  CONSTRAINT `fk_checkin_dudi` FOREIGN KEY (`dudi_id`) REFERENCES `dudi` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_checkin_siswa` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checkin`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `checkin` DISABLE KEYS */;
/*!40000 ALTER TABLE `checkin` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `dudi`
--

DROP TABLE IF EXISTS `dudi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dudi` (
  `id` varchar(64) NOT NULL,
  `nama` varchar(160) NOT NULL,
  `bidang` varchar(120) DEFAULT NULL,
  `alamat` varchar(255) DEFAULT NULL,
  `kota` varchar(120) DEFAULT NULL,
  `maps_url` varchar(500) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `pembimbing` varchar(160) DEFAULT NULL,
  `kontak` varchar(80) DEFAULT NULL,
  `jam` varchar(80) DEFAULT NULL,
  `radius_m` int(11) NOT NULL DEFAULT 100,
  `tone` varchar(40) NOT NULL DEFAULT 'bg-marine',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dudi`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `dudi` DISABLE KEYS */;
INSERT INTO `dudi` VALUES
('2aa881e0-b8ff-4407-a6a1-91d396c883dd','DJANGKARU STUDIO PHOTO','Percetakan','Jl. Raya, Bantarkawung, Kec. Bantarkawung, Kabupaten Brebes, Jawa Tengah 52274','Brebes','https://maps.app.goo.gl/ou5Zv4etEkSyT5Lw8',-7.2126593,108.9169091,'Testt','088866666666','08.00 - 05.00',100,'bg-marine','2026-10-19 19:38:56');
/*!40000 ALTER TABLE `dudi` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `jurnal`
--

DROP TABLE IF EXISTS `jurnal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `jurnal` (
  `id` varchar(64) NOT NULL,
  `siswa_id` varchar(64) NOT NULL,
  `tanggal` date NOT NULL,
  `masuk` varchar(10) DEFAULT NULL,
  `keluar` varchar(10) DEFAULT NULL,
  `judul` varchar(200) NOT NULL,
  `kegiatan` text DEFAULT NULL,
  `lampiran` text DEFAULT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'menunggu_dudi',
  `catatan_dudi` text DEFAULT NULL,
  `catatan_sekolah` text DEFAULT NULL,
  `verifikasi_dudi_at` datetime DEFAULT NULL,
  `verifikasi_dudi_hasil` varchar(20) DEFAULT NULL,
  `verifikasi_dudi_oleh` varchar(160) DEFAULT NULL,
  `verifikasi_sekolah_at` datetime DEFAULT NULL,
  `verifikasi_sekolah_hasil` varchar(20) DEFAULT NULL,
  `verifikasi_sekolah_oleh` varchar(160) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_jurnal_siswa` (`siswa_id`,`tanggal`),
  KEY `idx_jurnal_status` (`status`,`tanggal`),
  KEY `idx_jurnal_tanggal` (`tanggal`,`siswa_id`),
  KEY `idx_jurnal_created` (`created_at`),
  CONSTRAINT `fk_jurnal_siswa` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jurnal`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `jurnal` DISABLE KEYS */;
INSERT INTO `jurnal` VALUES
('32430924-ca4b-4fe9-8c49-3b3b85cccb71','cf5036ec-1f99-47d5-88f4-52c60b04dbe2','2026-10-19','07:55','16:30','KJJJJK','QWERTTY','8a812c8530bfcc55e74ec0960e3ba8f4.jpg','diterima',NULL,NULL,'2026-10-19 22:09:12','terima',NULL,'2026-10-21 21:47:55','terima','Amin Mutakin, S.Kom.','2026-10-19 20:32:28'),
('9b1bde77-91da-4014-b901-6cf2f32d92ec','cf5036ec-1f99-47d5-88f4-52c60b04dbe2','2026-10-21','07:55','16:30','wfdd','wdwfda','Notulen.docx','ditolak',NULL,'wdnq','2026-10-22 05:30:04','terima','Testt','2026-10-23 00:28:23','tolak','Amin Mutakin, S.Kom.','2026-10-21 22:17:41'),
('c2a3db22-b31d-4f93-ae32-e221aa789432','cf5036ec-1f99-47d5-88f4-52c60b04dbe2','2026-10-23','07:55','16:30','fesfs','frege4t3w','Buku agenda surat.xlsx','diterima',NULL,NULL,'2026-10-23 00:23:54','terima','Testt','2026-10-23 00:28:16','terima','Amin Mutakin, S.Kom.','2026-10-23 00:22:23');
/*!40000 ALTER TABLE `jurnal` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kelas` (
  `id` varchar(64) NOT NULL,
  `nama` varchar(80) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kelas_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
INSERT INTO `kelas` VALUES
('0506dc5a-c876-40d3-b3f0-3004fe5a53fe','XII TKJ 3','2026-10-19 19:04:09'),
('22a6cd6a-b8c4-459a-922e-22c45b0f6661','XII TSM 1','2026-10-19 19:04:13'),
('a5f8eda826b5bda1585c714fa8a8da98','XII TKJ 1','2026-10-19 19:01:31'),
('cd3126df-7b55-4d73-b134-e6fd71cbfe0e','XII TKJ 2','2026-10-19 19:03:53'),
('fae14850-6b68-42c1-8681-a1a1d3a50f81','XII BD 1','2026-10-19 19:03:44');
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `laporan`
--

DROP TABLE IF EXISTS `laporan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `laporan` (
  `id` varchar(64) NOT NULL,
  `siswa_id` varchar(64) NOT NULL,
  `judul` varchar(200) NOT NULL,
  `versi` int(11) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `ukuran` varchar(40) DEFAULT NULL,
  `halaman` int(11) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `jawaban` text DEFAULT NULL,
  `penilaian` text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_laporan_siswa` (`siswa_id`,`status`),
  KEY `idx_laporan_status` (`status`,`updated_at`),
  CONSTRAINT `fk_laporan_siswa` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `laporan`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `laporan` DISABLE KEYS */;
INSERT INTO `laporan` VALUES
('82bb90f4-dccd-42af-b311-a97194a5f46c','cf5036ec-1f99-47d5-88f4-52c60b04dbe2','BUKU TAMU',1,'revisi','12 KB',NULL,'Lengkapi lampiran dokumen',NULL,NULL,'2026-10-23 00:27:47');
/*!40000 ALTER TABLE `laporan` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `laporan_riwayat`
--

DROP TABLE IF EXISTS `laporan_riwayat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `laporan_riwayat` (
  `seq` bigint(20) NOT NULL AUTO_INCREMENT,
  `id` varchar(64) NOT NULL,
  `laporan_id` varchar(64) NOT NULL,
  `aksi` varchar(20) NOT NULL,
  `oleh` varchar(160) NOT NULL,
  `peran` varchar(20) NOT NULL,
  `catatan` text DEFAULT NULL,
  `versi` int(11) DEFAULT NULL,
  `waktu` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_riwayat_seq` (`seq`),
  KEY `idx_laporan_riwayat` (`laporan_id`,`waktu`),
  CONSTRAINT `fk_riwayat_laporan` FOREIGN KEY (`laporan_id`) REFERENCES `laporan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `laporan_riwayat`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `laporan_riwayat` DISABLE KEYS */;
INSERT INTO `laporan_riwayat` VALUES
(1,'abb44e26-0cfd-4aac-bd81-89141e501fe1','82bb90f4-dccd-42af-b311-a97194a5f46c','kirim','Muhammad Raffi','siswa',NULL,1,'2026-10-22 23:43:36'),
(2,'ea59fe15-36a8-4bfa-87e9-dbd4b832f76d','82bb90f4-dccd-42af-b311-a97194a5f46c','revisi','Amin Mutakin, S.Kom.','sekolah','Lengkapi lampiran dokumen',1,'2026-10-23 00:27:47');
/*!40000 ALTER TABLE `laporan_riwayat` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `notifikasi`
--

DROP TABLE IF EXISTS `notifikasi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifikasi` (
  `seq` bigint(20) NOT NULL AUTO_INCREMENT,
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `jenis` varchar(20) NOT NULL DEFAULT 'sistem',
  `judul` varchar(160) NOT NULL,
  `pesan` text DEFAULT NULL,
  `tautan` varchar(255) DEFAULT NULL,
  `tujuan` varchar(160) DEFAULT NULL,
  `wa_nomor` varchar(40) DEFAULT NULL,
  `wa_status` varchar(20) DEFAULT NULL,
  `wa_error` text DEFAULT NULL,
  `dibaca` tinyint(1) NOT NULL DEFAULT 0,
  `dibuat` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notif_seq` (`seq`),
  KEY `idx_notif_user` (`user_id`,`dibaca`,`dibuat`),
  KEY `idx_notif_dibuat` (`dibuat`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifikasi`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `notifikasi` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifikasi` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pengaturan`
--

DROP TABLE IF EXISTS `pengaturan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pengaturan` (
  `kunci` varchar(80) NOT NULL,
  `nilai` text NOT NULL,
  `diubah` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengaturan`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `pengaturan` DISABLE KEYS */;
INSERT INTO `pengaturan` VALUES
('pengingatAktif','0','2026-10-23 05:24:58');
/*!40000 ALTER TABLE `pengaturan` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `siswa`
--

DROP TABLE IF EXISTS `siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa` (
  `id` varchar(64) NOT NULL,
  `nis` varchar(40) NOT NULL,
  `nama` varchar(160) NOT NULL,
  `kelas` varchar(80) DEFAULT NULL,
  `telepon` varchar(40) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'aktif',
  `dudi_id` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_siswa_nis` (`nis`),
  KEY `idx_siswa_dudi` (`dudi_id`),
  CONSTRAINT `fk_siswa_dudi` FOREIGN KEY (`dudi_id`) REFERENCES `dudi` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
INSERT INTO `siswa` VALUES
('cf5036ec-1f99-47d5-88f4-52c60b04dbe2','123456','Muhammad Raffi','XII TKJ 2','088866666666','aktif','2aa881e0-b8ff-4407-a6a1-91d396c883dd'),
('e17d2bf9-885a-44a6-9a88-a04f1c780804','654321','Anjani Nailatussa\'adah','XII TKJ 2','088866666666','aktif','2aa881e0-b8ff-4407-a6a1-91d396c883dd');
/*!40000 ALTER TABLE `siswa` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `nama` varchar(160) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `siswa_id` varchar(64) DEFAULT NULL,
  `dudi_id` varchar(64) DEFAULT NULL,
  `google_sub` varchar(190) DEFAULT NULL,
  `google_email` varchar(190) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `username` varchar(60) DEFAULT NULL,
  `foto` varchar(190) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_google_sub` (`google_sub`),
  UNIQUE KEY `uq_users_google_email` (`google_email`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_siswa` (`siswa_id`),
  KEY `idx_users_dudi` (`dudi_id`),
  CONSTRAINT `fk_users_dudi` FOREIGN KEY (`dudi_id`) REFERENCES `dudi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_users_siswa` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_users_role` CHECK (`role` in ('siswa','dudi','sekolah','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('33a4d6eb-ae29-4325-9b17-62c13ad63053','Anjani Nailatussa\'adah','654321@its-raffy.my.id','s2$45ac51f5ca0c95a69b632576044422b2$885b0ced19b2410da46bd26247da1810cd74f20f1b90299ce8bdbca42c9f0323a9e80ae49b9179b9e0ddd9f79b958948bf48fd2b6b27b05726837336419b368d','siswa','e17d2bf9-885a-44a6-9a88-a04f1c780804',NULL,NULL,NULL,'2026-10-19 20:27:43',NULL,NULL),
('557d73fa-8db3-481f-80bc-01edc7f01b36','Muhammad Raffi','admin@its-raffy.my.id','s2$45ac51f5ca0c95a69b632576044422b2$885b0ced19b2410da46bd26247da1810cd74f20f1b90299ce8bdbca42c9f0323a9e80ae49b9179b9e0ddd9f79b958948bf48fd2b6b27b05726837336419b368d','admin',NULL,NULL,NULL,NULL,'2026-10-15 20:41:42',NULL,NULL),
('5c87a7b5-055c-4304-adee-ca6376bce65d','Testt','dudi@its-raffy.my.id','s2$45ac51f5ca0c95a69b632576044422b2$885b0ced19b2410da46bd26247da1810cd74f20f1b90299ce8bdbca42c9f0323a9e80ae49b9179b9e0ddd9f79b958948bf48fd2b6b27b05726837336419b368d','dudi',NULL,'2aa881e0-b8ff-4407-a6a1-91d396c883dd',NULL,NULL,'2026-10-19 22:08:29',NULL,NULL),
('a95f6fc6-3ceb-4d72-aa5d-87036e92b57d','Muhammad Raffi','123456@its-raffy.my.id','s2$45ac51f5ca0c95a69b632576044422b2$885b0ced19b2410da46bd26247da1810cd74f20f1b90299ce8bdbca42c9f0323a9e80ae49b9179b9e0ddd9f79b958948bf48fd2b6b27b05726837336419b368d','siswa','cf5036ec-1f99-47d5-88f4-52c60b04dbe2',NULL,NULL,NULL,'2026-10-19 20:21:15',NULL,NULL),
('f442deba-d25e-4e65-bbb1-fe9f61583ea2','Amin Mutakin, S.Kom.','pembimbing@its-raffy.my.id','s2$45ac51f5ca0c95a69b632576044422b2$885b0ced19b2410da46bd26247da1810cd74f20f1b90299ce8bdbca42c9f0323a9e80ae49b9179b9e0ddd9f79b958948bf48fd2b6b27b05726837336419b368d','sekolah',NULL,NULL,NULL,NULL,'2026-10-15 20:41:42',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-23 23:00:26
