import {
  IconHome,
  IconBook,
  IconFile,
  IconPin,
  IconCheck,
  IconUsers,
  IconGrid,
  IconBuilding,
  IconCalendar,
  IconBell,
  IconShield,
} from "@/components/icons";

export const NAV = {
  siswa: [
    { href: "/siswa", label: "Beranda", icon: IconHome },
    { href: "/siswa/jurnal", label: "Jurnal Harian", icon: IconBook },
    { href: "/siswa/laporan", label: "Laporan", icon: IconFile },
    { href: "/siswa/absensi", label: "Daftar Hadir", icon: IconCalendar },
    { href: "/siswa/lokasi", label: "Lokasi DUDI", icon: IconPin },
  ],
  dudi: [
    { href: "/pembimbing-dudi", label: "Beranda", icon: IconHome },
    { href: "/pembimbing-dudi/verifikasi", label: "Verifikasi Jurnal", icon: IconCheck, badge: "verif" },
    { href: "/pembimbing-dudi/siswa", label: "Siswa Bimbingan", icon: IconUsers },
  ],
  sekolah: [
    { href: "/pembimbing-sekolah", label: "Beranda", icon: IconHome },
    { href: "/pembimbing-sekolah/verifikasi", label: "Verifikasi Jurnal", icon: IconCheck, badge: "verif" },
    { href: "/pembimbing-sekolah/laporan", label: "Review Laporan", icon: IconFile, badge: "laporan" },
  ],
  admin: [
    { href: "/admin", label: "Beranda", icon: IconHome },
    { href: "/admin/siswa", label: "Data Siswa", icon: IconUsers },
    { href: "/admin/jurnal", label: "Tinjau Jurnal", icon: IconBook },
    { href: "/admin/kelas", label: "Kelas", icon: IconGrid },
    { href: "/admin/dudi", label: "Mitra DUDI", icon: IconBuilding },
    { href: "/admin/sekolah", label: "Pembimbing Sekolah", icon: IconShield },
    { href: "/admin/notifikasi", label: "Notifikasi", icon: IconBell },
    { href: "/admin/absensi", label: "Daftar Hadir", icon: IconCalendar },
  ],
};
