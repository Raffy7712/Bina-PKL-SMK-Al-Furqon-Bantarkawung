import { judulHalaman } from "@/lib/judul";

export const metadata = { title: judulHalaman("Jurnal Harian") };

export default function Layout({ children }) {
  return children;
}
