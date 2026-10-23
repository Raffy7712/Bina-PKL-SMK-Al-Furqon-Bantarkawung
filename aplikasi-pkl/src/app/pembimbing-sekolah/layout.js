import Shell from "@/components/shell";

export const metadata = {
  title: "Dasbor Pembimbing Sekolah",
  description: "Verifikasi akhir jurnal & review laporan siswa PKL.",
};

export default function PembimbingSekolahLayout({ children }) {
  return <Shell role="sekolah">{children}</Shell>;
}
