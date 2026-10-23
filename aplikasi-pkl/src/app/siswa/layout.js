import Shell from "@/components/shell";

export const metadata = {
  title: "Dasbor Siswa",
  description: "Jurnal harian, laporan, daftar hadir, dan lokasi DUDI.",
};

export default function SiswaLayout({ children }) {
  return <Shell role="siswa">{children}</Shell>;
}
