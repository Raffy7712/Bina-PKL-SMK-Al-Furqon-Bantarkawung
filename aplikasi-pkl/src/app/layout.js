import { Bricolage_Grotesque, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: {
    default: "Bina-PKL · Jurnal dan Laporan PKL · SMK Al Furqon Bantarkawung",
    template: "%s · Bina-PKL SMK Al Furqon",
  },
  description:
    "Jurnal dan laporan PKL SMK Al Furqon Bantarkawung: catatan harian, verifikasi DUDI dan sekolah, kehadiran, nilai rubrik.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${bricolage.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
