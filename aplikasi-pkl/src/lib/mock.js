
export const ROLE_META = {
  siswa: {
    label: "Siswa",
    deskripsi: "Menulis jurnal harian & mengunggah laporan",
    href: "/siswa",
    tone: "yellow",
    user: { nama: "Alya Putri Ramadhani", sub: "NIS 2401001 · XII RPL 1" },
  },
  dudi: {
    label: "Pembimbing DUDI",
    deskripsi: "Verifikasi jurnal dari sisi tempat PKL",
    href: "/pembimbing-dudi",
    tone: "green",
    user: { nama: "Bagas Pratama", sub: "PT Nusantara Digital" },
  },
  sekolah: {
    label: "Pembimbing Sekolah",
    deskripsi: "Verifikasi akhir jurnal & review laporan",
    href: "/pembimbing-sekolah",
    tone: "purple",
    user: { nama: "Ibu Rina Wulandari, S.Kom", sub: "Guru Pembimbing PKL" },
  },
  admin: {
    label: "Admin",
    deskripsi: "Kelola siswa, mitra DUDI & rekap kehadiran",
    href: "/admin",
    tone: "pink",
    user: { nama: "Muhammad Raffi", sub: "Administrator Sekolah" },
  },
};

export const DUDI = [
  {
    id: "d1",
    nama: "PT Nusantara Digital",
    bidang: "Software House",
    alamat: "Jl. Ahmad Yani No. 120, Cibiru, Bandung",
    kota: "Bandung",
    koordinat: "-6.9175, 107.6191",
    pembimbing: "Bagas Pratama",
    kontak: "0812-1100-4477",
    jam: "07.30 – 16.30",
    jmlSiswa: 3,
    tone: "bg-marine",
    maps: "https://maps.google.com/?q=-6.9175,107.6191",
  },
  {
    id: "d2",
    nama: "CV Kreatif Media",
    bidang: "Digital Agency",
    alamat: "Jl. Soekarno-Hatta No. 45, Bandung",
    kota: "Bandung",
    koordinat: "-6.9735, 107.6266",
    pembimbing: "Dewi Anggraini",
    kontak: "0857-9922-1010",
    jam: "08.00 – 17.00",
    jmlSiswa: 2,
    tone: "bg-candy",
    maps: "https://maps.google.com/?q=-6.9735,107.6266",
  },
  {
    id: "d3",
    nama: "PT Sinar Teknik",
    bidang: "Manufaktur",
    alamat: "Kawasan Industri Cimahi, Blok C-7",
    kota: "Cimahi",
    koordinat: "-6.8841, 107.5434",
    pembimbing: "Yusuf Maulana",
    kontak: "0813-2244-8080",
    jam: "07.00 – 16.00",
    jmlSiswa: 2,
    tone: "bg-tang",
    maps: "https://maps.google.com/?q=-6.8841,107.5434",
  },
  {
    id: "d4",
    nama: "Bank Cahaya Sejahtera",
    bidang: "Perbankan",
    alamat: "Jl. Merdeka No. 8, Bandung",
    kota: "Bandung",
    koordinat: "-6.9218, 107.6094",
    pembimbing: "Sinta Larasati",
    kontak: "0811-2233-5566",
    jam: "08.00 – 15.30",
    jmlSiswa: 2,
    tone: "bg-mint",
    maps: "https://maps.google.com/?q=-6.9218,107.6094",
  },
  {
    id: "d5",
    nama: "Studio Arunika",
    bidang: "Graphic Design",
    alamat: "Jl. Riau No. 210, Bandung",
    kota: "Bandung",
    koordinat: "-6.9034, 107.6182",
    pembimbing: "Raka Wijaya",
    kontak: "0819-3344-1212",
    jam: "09.00 – 18.00",
    jmlSiswa: 1,
    tone: "bg-grape",
    maps: "https://maps.google.com/?q=-6.9034,107.6182",
  },
  {
    id: "d6",
    nama: "Apotek Sehat Bersama",
    bidang: "Kesehatan",
    alamat: "Jl. Antapani No. 55, Bandung",
    kota: "Bandung",
    koordinat: "-6.9101, 107.6783",
    pembimbing: "apt. Nadia Putri",
    kontak: "0812-7788-9090",
    jam: "08.00 – 21.00",
    jmlSiswa: 1,
    tone: "bg-sun",
    maps: "https://maps.google.com/?q=-6.9101,107.6783",
  },
];

export const SISWA = [
  { id: "s1", nama: "Alya Putri Ramadhani", nis: "2401001", kelas: "XII RPL 1", dudiId: "d1", status: "aktif" },
  { id: "s2", nama: "Dimas Aryo Saputra", nis: "2401002", kelas: "XII RPL 1", dudiId: "d1", status: "aktif" },
  { id: "s3", nama: "Nabila Zahra", nis: "2401003", kelas: "XII RPL 2", dudiId: "d2", status: "aktif" },
  { id: "s4", nama: "Fajar Nugroho", nis: "2401004", kelas: "XII RPL 2", dudiId: "d3", status: "aktif" },
  { id: "s5", nama: "Salsabila Ayu", nis: "2401005", kelas: "XII TKJ 1", dudiId: "d4", status: "aktif" },
  { id: "s6", nama: "Rizky Ramadhan", nis: "2401006", kelas: "XII TKJ 1", dudiId: "d3", status: "aktif" },
  { id: "s7", nama: "Intan Permata", nis: "2401007", kelas: "XII DKV 1", dudiId: "d5", status: "aktif" },
  { id: "s8", nama: "Bagus Setiawan", nis: "2401008", kelas: "XII AKL 1", dudiId: "d6", status: "aktif" },
  { id: "s9", nama: "Tri Lestari", nis: "2401009", kelas: "XII AKL 1", dudiId: "d4", status: "pindah" },
  { id: "s10", nama: "Yoga Pratama", nis: "2401010", kelas: "XII RPL 1", dudiId: "d2", status: "aktif" },
  { id: "s11", nama: "Kevin Alfarizi", nis: "2401011", kelas: "XII RPL 1", dudiId: "d1", status: "aktif" },
];

export const JURNAL = [
  {
    id: "j1", siswaId: "s1", tanggal: "2026-10-14", masuk: "07:52", keluar: "16:30",
    judul: "Integrasi API pembayaran",
    kegiatan: "Menghubungkan endpoint payment gateway ke dashboard kasir, menangani callback notifikasi, dan menulis unit test untuk alur transaksi gagal.",
    status: "menunggu_dudi",
    lampiran: "screenshot-callback.png",
  },
  {
    id: "j2", siswaId: "s1", tanggal: "2026-10-13", masuk: "07:58", keluar: "16:25",
    judul: "Perbaikan bug form login",
    kegiatan: "Memperbaiki validasi form login yang salah menampilkan pesan error, menambahkan rate limit sederhana, dan request review ke mentor.",
    status: "menunggu_sekolah",
    catatanDudi: "Bagus, kode sudah rapi. Lanjutkan.",
    lampiran: "diff-login.txt",
  },
  {
    id: "j3", siswaId: "s1", tanggal: "2026-10-12", masuk: "08:03", keluar: "16:10",
    judul: "Desain komponen tabel data",
    kegiatan: "Membuat komponen tabel responsif di Figma lalu menerjemahkannya ke React + Tailwind.",
    status: "diterima",
    catatanDudi: "Sesuai standar tim.",
    catatanSekolah: "Jurnal sudah lengkap. Pertahankan.",
    lampiran: "tabel-v2.png",
  },
  {
    id: "j4", siswaId: "s1", tanggal: "2026-10-09", masuk: "07:45", keluar: "16:35",
    judul: "Riset kompetitor fitur absensi",
    kegiatan: "Mengumpulkan 5 aplikasi absensi kompetitor, membuat matriks perbandingan fitur, dan rekomendasi 3 ide fitur baru.",
    status: "diterima",
    catatanDudi: "Riset mendalam.",
    catatanSekolah: "Bagus, analisisnya terstruktur.",
    lampiran: "matriks-kompetitor.pdf",
  },
  {
    id: "j5", siswaId: "s1", tanggal: "2026-10-08", masuk: "08:11", keluar: "16:02",
    judul: "Setup environment deployment",
    kegiatan: "Mengonfigurasi CI/CD sederhana, environment staging, dan deploy pertama kali ke server.",
    status: "diterima",
    catatanDudi: "Deploy lancar.",
    catatanSekolah: "Oke.",
    lampiran: "log-deploy.txt",
  },
  {
    id: "j6", siswaId: "s1", tanggal: "2026-10-07", masuk: "07:50", keluar: "16:20",
    judul: "Diskusi sprint & pembagian task",
    kegiatan: "Ikut meeting harian, mengambil task pembuatan halaman laporan, dan memecah task menjadi sub-task kecil.",
    status: "ditolak",
    catatanDudi: "Lampiran bukti belum ada, tolong dilengkapi.",
    lampiran: "",
  },
  {
    id: "j7", siswaId: "s2", tanggal: "2026-10-14", masuk: "07:57", keluar: "16:15",
    judul: "Migrasi database tabel order",
    kegiatan: "Menulis skrip migrasi, menjalankan di staging, dan membandingkan hasil row count.",
    status: "menunggu_dudi",
    lampiran: "migrasi-v3.sql",
  },
  {
    id: "j8", siswaId: "s2", tanggal: "2026-10-13", masuk: "08:00", keluar: "16:05",
    judul: "Review kode junior",
    kegiatan: "Me-review 3 pull request junior developer dan memberikan komentar perbaikan.",
    status: "menunggu_sekolah",
    catatanDudi: "Catatan review tajam, bagus.",
    lampiran: "review.md",
  },
  {
    id: "j9", siswaId: "s3", tanggal: "2026-10-14", masuk: "07:49", keluar: "16:40",
    judul: "Konten media sosial klien",
    kegiatan: "Membuat 4 desain konten Instagram, menulis caption, dan menjadwalkan posting.",
    status: "menunggu_dudi",
    lampiran: "konten-ig.zip",
  },
  {
    id: "j10", siswaId: "s3", tanggal: "2026-10-13", masuk: "07:55", keluar: "16:22",
    judul: "Revisi brand guideline",
    kegiatan: "Menyesuaikan warna dan tipografi sesuai feedback klien.",
    status: "diterima",
    catatanDudi: "Sesuai brief.",
    catatanSekolah: "Terstruktur.",
    lampiran: "guideline-v2.pdf",
  },
  {
    id: "j11", siswaId: "s4", tanggal: "2026-10-14", masuk: "07:05", keluar: "16:00",
    judul: "Pemeriksaan mesin CNC",
    kegiatan: "Melakukan kalibrasi sumbu X, mencatat hasil di checklist harian, dan membersihkan area kerja.",
    status: "menunggu_dudi",
    lampiran: "checklist-cnc.jpg",
  },
  {
    id: "j12", siswaId: "s4", tanggal: "2026-10-13", masuk: "07:02", keluar: "16:10",
    judul: "Penyusunan laporan produksi",
    kegiatan: "Menginput data hasil produksi mingguan ke spreadsheet dan membuat grafik.",
    status: "menunggu_sekolah",
    catatanDudi: "Data akurat.",
    lampiran: "produksi-mgu41.xlsx",
  },
  {
    id: "j13", siswaId: "s5", tanggal: "2026-10-13", masuk: "08:04", keluar: "15:50",
    judul: "Konseling obat pasien",
    kegiatan: "Membantu informasi obat sesuai resep dan menjelaskan aturan pakai kepada pasien.",
    status: "diterima",
    catatanDudi: "Komunikasi jelas.",
    catatanSekolah: "Sesuai etika profesi.",
    lampiran: "log-konseling.pdf",
  },
  {
    id: "j14", siswaId: "s7", tanggal: "2026-10-14", masuk: "09:02", keluar: "18:05",
    judul: "Konsep poster event musik",
    kegiatan: "Membuat 3 alternatif konsep poster dan presentasi ke art director.",
    status: "menunggu_dudi",
    lampiran: "poster-konsep.zip",
  },
  {
    id: "j15", siswaId: "s7", tanggal: "2026-10-12", masuk: "09:00", keluar: "18:00",
    judul: "Ilustrasi aset karakter",
    kegiatan: "Menggambar aset karakter untuk animasi promosi, finalisasi warna.",
    status: "diterima",
    catatanSekolah: "Kreatif.",
    lampiran: "aset-karakter.png",
  },
  {
    id: "j16", siswaId: "s11", tanggal: "2026-10-14", masuk: "07:54", keluar: "16:28",
    judul: "Dashboard laporan penjualan",
    kegiatan: "Membuat chart grafik penjualan bulanan dan menyambungkan filter tanggal ke API mock.",
    status: "menunggu_dudi",
    lampiran: "dashboard-v1.png",
  },
  {
    id: "j17", siswaId: "s11", tanggal: "2026-10-13", masuk: "07:51", keluar: "16:33",
    judul: "Onboarding proyek baru",
    kegiatan: "Membaca dokumentasi kodebase, menjalankan aplikasi lokal, dan mencatat istilah bisnis.",
    status: "diterima",
    catatanDudi: "Selamat bergabung, jaga konsistensi.",
    catatanSekolah: "Pembiasaan diri yang baik.",
    lampiran: "catatan-onboarding.md",
  },
];

export const NOTIF = [
  { id: "n1", text: "Jurnal Alya menunggu verifikasi DUDI", waktu: "10 mnt lalu", tone: "bg-sun" },
  { id: "n2", text: "Laporan Nabila diterima pembimbing sekolah", waktu: "1 jam lalu", tone: "bg-mint" },
  { id: "n3", text: "Jurnal Ditto ditolak, lampiran belum ada", waktu: "3 jam lalu", tone: "bg-cherry" },
  { id: "n4", text: "3 siswa belum menulis jurnal hari ini", waktu: "5 jam lalu", tone: "bg-tang" },
];

export const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatTanggal(iso, withYear = false) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const out = `${HARI[date.getDay()]}, ${d} ${BULAN[m - 1]}`;
  return withYear ? `${out} ${y}` : out;
}

export function dudiOf(siswaId) {
  const s = SISWA.find((x) => x.id === siswaId);
  return DUDI.find((d) => d.id === s?.dudiId) ?? DUDI[0];
}

export function siswaOf(id) {
  return SISWA.find((s) => s.id === id) ?? SISWA[0];
}

export function jurnalSiswa(siswaId = "s1") {
  return JURNAL.filter((j) => j.siswaId === siswaId).sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal)
  );
}

export function rekapHadir(siswaId, tahun = 2026, bulan = 9) {
  const list = jurnalSiswa(siswaId).filter((j) => {
    const [y, m] = j.tanggal.split("-").map(Number);
    return y === tahun && m - 1 === bulan && j.status !== "ditolak";
  });
  return list.length;
}

export function kalenderHadir(siswaId, tahun = 2026, bulan = 9) {
  const punya = new Set(
    jurnalSiswa(siswaId)
      .filter((j) => j.status !== "ditolak")
      .map((j) => j.tanggal)
  );
  const totalHari = new Date(tahun, bulan + 1, 0).getDate();
  const hariIni = new Date(2026, 9, 14);
  const cells = [];
  for (let d = 1; d <= totalHari; d++) {
    const date = new Date(tahun, bulan, d);
    const iso = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const lewat = date > hariIni;
    let state = "kosong";
    if (weekend) state = "libur";
    else if (punya.has(iso)) state = "hadir";
    else if (lewat) state = "akan";
    else state = "alpa";
    cells.push({ d, iso, state, hari: date.getDay() });
  }
  return cells;
}

export const FILTER_STATUS = [
  { key: "semua", label: "Semua" },
  { key: "menunggu_dudi", label: "Menunggu DUDI" },
  { key: "menunggu_sekolah", label: "Menunggu Sekolah" },
  { key: "diterima", label: "Diterima" },
  { key: "ditolak", label: "Ditolak" },
];
