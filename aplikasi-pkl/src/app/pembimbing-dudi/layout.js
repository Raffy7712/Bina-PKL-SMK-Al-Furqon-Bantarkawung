import Shell from "@/components/shell";

export const metadata = {
  title: "Dasbor Pembimbing DUDI",
  description: "Verifikasi jurnal harian siswa dari sisi tempat PKL.",
};

export default function PembimbingDudiLayout({ children }) {
  return <Shell role="dudi">{children}</Shell>;
}
