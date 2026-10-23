import Link from "next/link";
import SchoolLogo from "@/components/school-logo";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 py-16">
      <div className="w-full max-w-md rounded-brutal bg-white p-8 text-center shadow-brutal">
        <SchoolLogo className="mx-auto" />
        <p className="mt-6 font-display text-6xl leading-none">404</p>
        <h1 className="mt-2 font-display text-xl">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm font-semibold text-ink/70">
          Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-brutal bg-sun px-4 py-2 text-sm font-bold tracking-wide shadow-brutal-sm transition-all  active:opacity-90"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
