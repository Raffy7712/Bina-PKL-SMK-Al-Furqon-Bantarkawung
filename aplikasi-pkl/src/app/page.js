import { Btn } from "@/components/ui";
import SchoolLogo from "@/components/school-logo";

export const metadata = {
  title: "Bina-PKL: Sistem Informasi Praktik Kerja Lapangan",
  description:
    "Jurnal dan laporan PKL SMK Al Furqon Bantarkawung: catatan harian siswa, verifikasi DUDI dan sekolah, daftar hadir, nilai rubrik.",
};

const ALUR = [
  {
    no: "01",
    judul: "Siswa mencatat",
    teks: "Jurnal harian dari tempat PKL, dengan jam dan bukti.",
  },
  {
    no: "02",
    judul: "DUDI review",
    teks: "Pembimbing perusahaan membaca, lalu approve atau minta revisi.",
  },
  {
    no: "03",
    judul: "Sekolah mengesahkan",
    teks: "Guru pembimbing menutup alurnya, termasuk nilai laporan.",
  },
  {
    no: "04",
    judul: "Rekap sendiri",
    teks: "Kehadiran mengikuti jurnal, tanpa absensi terpisah.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-ink/12 bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-8">
          <SchoolLogo />
          <span className="ml-auto hidden text-sm text-ink/65 sm:block">
            SMK Al Furqon Bantarkawung
          </span>
          <Btn
            href="/login"
            tone="ink"
            size="sm"
            className="ml-auto sm:ml-4"
          >
            Masuk
          </Btn>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
        {}
        <section className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-tight">
              Bina-PKL
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70 sm:text-xl">
              Catatan PKL yang rapi dari hari pertama sampai nilai keluar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Btn href="/login" tone="ink" size="lg" className="px-8">
                Masuk ke aplikasi
              </Btn>
              <span className="text-sm text-ink/65">
                Akun dibuat admin sekolah.
              </span>
            </div>
          </div>

          {}
          <dl className="grid gap-0 divide-y divide-ink/10 border-y border-ink/10">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink/65">Jurnal</dt>
              <dd className="text-sm font-medium">Jam dan bukti</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink/65">Verifikasi</dt>
              <dd className="text-sm font-medium">DUDI, lalu sekolah</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink/65">Kehadiran</dt>
              <dd className="text-sm font-medium">Ikut jurnal</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-ink/65">Nilai</dt>
              <dd className="text-sm font-medium">Rubrik empat aspek</dd>
            </div>
          </dl>
        </section>

        {}
        <section className="border-t border-ink/10 py-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Satu alur, empat langkah
            </h2>
            <p className="text-sm text-ink/65">Sama untuk semua jurusan.</p>
          </div>

          <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {ALUR.map((a) => (
              <li key={a.no} className="flex gap-4">
                <span className="font-mono text-xs tabular-nums text-ink/65">
                  {a.no}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{a.judul}</h3>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-ink/65">
                    {a.teks}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {}
        <section className="border-t border-ink/10 py-14">
          <div className="grid gap-8 sm:grid-cols-[0.4fr_1fr]">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Sebelum masuk
            </h2>
            <ul className="grid gap-3 text-sm leading-relaxed text-ink/70">
              <li>Semua catatan tersimpan di database sekolah.</li>
              <li>
                Pengingat lewat WhatsApp memakai nomor dari data siswa, dan tetap
                masuk di lonceng aplikasi bila nomornya kosong.
              </li>
              <li>Belum punya akun? Hubungi admin PKL sekolah.</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-ink/65">
          <span>Bina-PKL, SMK Al Furqon Bantarkawung</span>
          <span className="font-mono text-xs">2026</span>
        </div>
      </footer>
    </div>
  );
}
