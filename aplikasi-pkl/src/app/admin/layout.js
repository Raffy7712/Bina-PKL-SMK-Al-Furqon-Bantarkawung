import Shell from "@/components/shell";

export const metadata = {
  title: "Dasbor Admin",
  description: "Kelola siswa, mitra DUDI, dan rekap kehadiran PKL.",
};

export default function AdminLayout({ children }) {
  return <Shell role="admin">{children}</Shell>;
}
