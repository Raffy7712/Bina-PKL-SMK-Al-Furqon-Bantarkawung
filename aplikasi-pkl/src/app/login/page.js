"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Btn, Field, Input } from "@/components/ui";
import SchoolLogo from "@/components/school-logo";
import { api } from "@/lib/api";
import { IconGoogle } from "@/components/icons";

const PESAN_GOOGLE = {
  belum_diatur: "Masuk dengan Google belum diaktifkan admin sekolah.",
  kedaluwarsa: "Sesi Google sudah kedaluwarsa. Coba masuk lagi.",
  dibatalkan: "Masuk dengan Google dibatalkan.",
  gagal: "Gagal menghubungi Google. Coba lagi sebentar lagi.",
  email_tidak_terverifikasi: "Email Google belum terverifikasi.",
  sudah_dipakai: "Akun Google itu sudah terhubung ke akun Bina-PKL lain.",
  belum_taut:
    "Akun Google ini belum ditautkan. Masuk dengan NIS atau sandi, lalu tautkan dari Akun & Keamanan.",
  sesi: "Sesi kamu berakhir. Masuk dulu sebelum menghubungkan Google.",
};

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const googleError = search.get("google_error");

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [googleAktif, setGoogleAktif] = useState(false);
  const [caps, setCaps] = useState(false);

  const tujuanAman =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  useEffect(() => {
    api("/api/auth/status")
      .then((d) => {
        if (d.masuk) router.replace(tujuanAman ?? d.user.href);
      })
      .catch(() => {});
  }, [router, tujuanAman]);

  useEffect(() => {
    api("/api/auth/google/status")
      .then((d) => setGoogleAktif(Boolean(d.aktif)))
      .catch(() => {});
  }, []);

  const pantauCaps = (e) => setCaps(Boolean(e.getModifierState?.("CapsLock")));

  async function handleSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: form,
      });
      router.push(tujuanAman ?? res.href);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <SchoolLogo className="mb-10" />

        {}
        <span aria-hidden className="block h-1.5 w-12 rounded-full bg-sun" />

        <h1 className="mt-4 font-display text-4xl font-bold leading-none tracking-tight">
          Masuk
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">
          Satu pintu untuk semua peran.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <Field label="Username, email, atau NIS">
            <Input
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="cth. raffy, 2401001, atau nama@its-raffy.my.id"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-autofocus
              required
            />
          </Field>
          <Field
            label="Kata sandi"
            hint={caps ? "Caps Lock sedang aktif." : undefined}
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={pantauCaps}
              onKeyUp={pantauCaps}
              onBlur={() => setCaps(false)}
              placeholder="Kata sandi akun"
              autoComplete="current-password"
              required
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="rounded-brutal bg-cherry/25 px-4 py-3 text-sm ring-1 ring-cherry/60"
            >
              {error}
            </p>
          ) : null}

          {googleError ? (
            <p
              role="alert"
              className="rounded-brutal bg-sun/30 px-4 py-3 text-sm ring-1 ring-tang/40"
            >
              {PESAN_GOOGLE[googleError] ?? "Masuk dengan Google gagal. Coba lagi."}
            </p>
          ) : null}

          <Btn
            tone="ink"
            size="lg"
            type="submit"
            className="mt-1 w-full"
            disabled={pending}
          >
            {pending ? "Memeriksa…" : "Masuk"}
          </Btn>

          {googleAktif ? (
            <>
              <div className="flex items-center gap-4" aria-hidden>
                <span className="h-px flex-1 bg-ink/15" />
                <span className="text-xs text-ink/65">atau</span>
                <span className="h-px flex-1 bg-ink/15" />
              </div>
              <a
                href={`/api/auth/google/mulai?mode=masuk${
                  tujuanAman ? `&next=${encodeURIComponent(tujuanAman)}` : ""
                }`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-brutal bg-white px-4 py-3 text-sm shadow-brutal-sm ring-1 ring-ink/50 transition-colors hover:bg-paper"
              >
                <IconGoogle size={18} /> Masuk dengan Google
              </a>
            </>
          ) : null}
        </form>

        <p className="mt-8 text-sm leading-relaxed text-ink/65">
          Lupa sandi atau belum punya akun? Hubungi admin PKL sekolah.
        </p>

        <p className="mt-12 text-xs text-ink/65">
          Bina-PKL, SMK Al Furqon Bantarkawung
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
