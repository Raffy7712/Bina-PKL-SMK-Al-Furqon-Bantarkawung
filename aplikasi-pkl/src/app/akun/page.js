"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Panel,
  Btn,
  Badge,
  Avatar,
  Field,
  Input,
  PageHeader,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import { IconGoogle, IconX } from "@/components/icons";
import { api } from "@/lib/api";

const PESAN_GOOGLE = {
  kedaluwarsa: "Sesi Google sudah kedaluwarsa. Coba hubungkan lagi.",
  dibatalkan: "Penghubungan Google dibatalkan.",
  gagal: "Gagal menghubungi Google. Coba lagi sebentar lagi.",
  email_tidak_terverifikasi:
    "Email Google itu belum terverifikasi. Pakai akun Google lain.",
  sudah_dipakai: "Akun Google itu sudah terhubung ke akun Bina-PKL lain.",
  belum_taut: "Akun Google ini belum terhubung ke akun Bina-PKL mana pun.",
  belum_diatur: "Admin sekolah belum mengaktifkan masuk dengan Google.",
  sesi: "Sesi kamu berakhir. Masuk dulu sebelum menghubungkan Google.",
};

const LABEL_ROLE = {
  siswa: "Siswa",
  dudi: "Pembimbing DUDI",
  sekolah: "Pembimbing Sekolah",
  admin: "Admin",
};

function Baris({ label, nilai }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-2 border-ink/10 pb-2 last:">
      <dt className="text-[11px] font-bold tracking-wide text-ink/65">
        {label}
      </dt>
      <dd className="text-right text-sm font-bold">{nilai ?? "-"}</dd>
    </div>
  );
}

function IsiAkun() {
  const search = useSearchParams();
  const [akun, setAkun] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState("");
  const [toast, setToast] = useState(() =>
    search.get("google") === "ok" ? "Akun Google berhasil dihubungkan." : ""
  );

  const [sandi, setSandi] = useState({ lama: "", baru: "", ulang: "" });
  const [galatSandi, setGalatSandi] = useState("");
  const [sibukSandi, setSibukSandi] = useState(false);
  const [sibukGoogle, setSibukGoogle] = useState(false);

  const [username, setUsername] = useState("");
  const [galatUsername, setGalatUsername] = useState("");
  const [sibukUsername, setSibukUsername] = useState(false);
  const [sibukFoto, setSibukFoto] = useState(false);
  const inputFoto = useRef(null);

  function showToast(msg) {
    setToast(msg);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let batal = false;
    api("/api/akun")
      .then((d) => {
        if (batal) return;
        setAkun(d.akun);
        setUsername(d.akun.username ?? "");
      })
      .catch((e) => {
        if (!batal) setGalatMuat(e.message);
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  const googleError = search.get("google_error");

  async function simpanSandi(e) {
    e.preventDefault();
    setGalatSandi("");
    if (sandi.baru.length < 6) {
      setGalatSandi("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (sandi.baru !== sandi.ulang) {
      setGalatSandi("Ulangi kata sandi tidak sama.");
      return;
    }
    setSibukSandi(true);
    try {
      await api("/api/akun/sandi", {
        method: "POST",
        body: { lama: sandi.lama, baru: sandi.baru },
      });
      setSandi({ lama: "", baru: "", ulang: "" });
      showToast("Kata sandi berhasil diganti.");
    } catch (err) {
      setGalatSandi(err.message);
    } finally {
      setSibukSandi(false);
    }
  }

  async function putusGoogle() {
    setSibukGoogle(true);
    try {
      const d = await api("/api/akun/google-putus", { method: "POST", body: {} });
      setAkun((a) => (a ? { ...a, googleEmail: null } : a));
      showToast(
        d.dihapus ? `Tautan Google ${d.dihapus} diputus.` : "Tautan Google diputus."
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibukGoogle(false);
    }
  }

  async function simpanUsername(e) {
    e.preventDefault();
    setGalatUsername("");
    setSibukUsername(true);
    try {
      const d = await api("/api/akun/username", {
        method: "POST",
        body: { username },
      });
      setAkun((a) => (a ? { ...a, username: d.username } : a));
      setUsername(d.username ?? "");
      showToast(
        d.username ? `Username "${d.username}" disimpan.` : "Username dihapus."
      );
    } catch (err) {
      setGalatUsername(err.message);
    } finally {
      setSibukUsername(false);
    }
  }

  async function unggahFoto(e) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    setSibukFoto(true);
    try {
      const isi = new FormData();
      isi.append("foto", berkas);
      const res = await fetch("/api/akun/foto", { method: "POST", body: isi });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Gagal mengunggah foto.");
      setAkun((a) =>
        a ? { ...a, fotoUrl: `/api/akun/foto?v=${encodeURIComponent(d.foto)}` } : a
      );
      window.dispatchEvent(new Event("pkl-profil-berubah"));
      showToast("Foto profil diperbarui.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibukFoto(false);
      e.target.value = "";
    }
  }

  async function hapusFoto() {
    setSibukFoto(true);
    try {
      await fetch("/api/akun/foto", { method: "DELETE" });
      setAkun((a) => (a ? { ...a, fotoUrl: null } : a));
      window.dispatchEvent(new Event("pkl-profil-berubah"));
      showToast("Foto profil dihapus.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibukFoto(false);
    }
  }

  if (memuat) return <LoadingBlock label="Memuat akun…" />;

  if (!akun) {
    return (
      <Panel tone="bg-cherry/40" className="p-5">
        <p className="text-sm font-bold">
          Gagal memuat akun: {galatMuat || "tidak diketahui"}
        </p>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        title="Akun & Keamanan"
        desc="Sandi dan tautan Google milikmu."
      />

      {googleError ? (
        <p
          role="alert"
          className="mb-4 rounded-brutal bg-sun/70 px-3 py-2 text-sm font-bold"
        >
          {PESAN_GOOGLE[googleError] ??
            "Terjadi masalah pada tautan Google. Coba lagi."}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="grid h-fit gap-5">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl">Profil</h2>
              <Badge tone="purple">{LABEL_ROLE[akun.role] ?? akun.role}</Badge>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Avatar name={akun.nama} size="lg" src={akun.fotoUrl} />
              <div className="grid gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Btn
                    tone="white"
                    size="sm"
                    onClick={() => inputFoto.current?.click()}
                    disabled={sibukFoto}
                  >
                    {sibukFoto
                      ? "Memproses…"
                      : akun.fotoUrl
                        ? "Ganti foto"
                        : "Unggah foto"}
                  </Btn>
                  {akun.fotoUrl ? (
                    <Btn
                      tone="white"
                      size="sm"
                      onClick={hapusFoto}
                      disabled={sibukFoto}
                    >
                      <IconX size={14} /> Hapus
                    </Btn>
                  ) : null}
                </div>
                <span className="text-[11px] font-semibold text-ink/60">
                  JPG, PNG, atau WEBP, maksimal 2 MB.
                </span>
              </div>
              <input
                ref={inputFoto}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={unggahFoto}
              />
            </div>

            <dl className="mt-4 grid gap-2.5">
              <Baris label="Nama" nilai={akun.nama} />
              {akun.role === "siswa" ? <Baris label="NIS" nilai={akun.nis} /> : null}
              {akun.role === "siswa" ? (
                <Baris label="Kelas" nilai={akun.kelas} />
              ) : null}
              {akun.role === "dudi" ? (
                <Baris label="Mitra DUDI" nilai={akun.dudiNama} />
              ) : null}
              <Baris label="Email masuk" nilai={akun.email} />
              <Baris label="Username" nilai={akun.username} />
            </dl>
            <p className="mt-4 text-[11px] font-bold tracking-wide text-ink/65">
              Bisa masuk pakai username, email, atau NIS, dengan sandi
              {akun.googleEmail ? " atau akun Google" : ""}.
            </p>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-display text-xl">Username untuk masuk</h2>
            <p className="mt-1 text-sm font-semibold text-ink/70">
              Nama pendek untuk masuk. Huruf kecil, angka, titik, garis
              bawah, atau strip.
            </p>
            <form onSubmit={simpanUsername} className="mt-3 grid gap-3">
              <Field
                label="Username"
                hint="3 sampai 30 karakter. Kosongkan lalu simpan untuk menghapus."
              >
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cth. raffy"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Field>
              {galatUsername ? (
                <p
                  role="alert"
                  className="rounded-brutal bg-cherry/40 px-3 py-2 text-sm font-bold"
                >
                  {galatUsername}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Btn tone="yellow" type="submit" disabled={sibukUsername}>
                  {sibukUsername ? "Menyimpan…" : "Simpan username"}
                </Btn>
                <span className="text-[11px] font-semibold text-ink/65">
                  Berlaku untuk masuk berikutnya.
                </span>
              </div>
            </form>
          </Panel>

          <Panel tone="bg-paper" className="p-5">
            <h2 className="font-display flex items-center gap-2 text-xl">
              <IconGoogle size={20} /> Akun Google
            </h2>

            {!akun.googleAktif ? (
              <p className="mt-3 text-sm font-semibold text-ink/70">
                Masuk dengan Google belum diaktifkan admin sekolah.
              </p>
            ) : akun.googleEmail ? (
              <>
                <p className="mt-3 text-sm font-semibold">
                  Terhubung dengan <strong>{akun.googleEmail}</strong>. Kamu bisa
                  masuk lewat tombol “Masuk dengan Google” di halaman login.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Btn
                    tone="white"
                    size="sm"
                    onClick={putusGoogle}
                    disabled={sibukGoogle}
                  >
                    <IconX size={14} /> {sibukGoogle ? "Memutus…" : "Putuskan tautan"}
                  </Btn>
                  <span className="text-[11px] font-semibold text-ink/65">
                    Sandi NIS/email tetap bisa dipakai.
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm font-semibold text-ink/70">
                  Hubungkan akun Google pribadimu supaya bisa masuk tanpa
                  mengetik sandi. Akun Bina-PKL tetap satu; Google hanya jadi
                  kunci tambahan.
                </p>
                {}
                <a
                  href="/api/auth/google/mulai?mode=tautkan&next=%2Fakun"
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-brutal bg-sun px-4 py-2 text-sm font-bold tracking-wide shadow-brutal-sm transition-all  active:opacity-90"
                >
                  <IconGoogle size={16} /> Hubungkan akun Google
                </a>
              </>
            )}
          </Panel>
        </div>

        <Panel className="h-fit p-5">
          <h2 className="font-display text-xl">Ganti kata sandi</h2>
          <p className="mt-1 text-xs font-semibold text-ink/65">
            Perlu sandi lama, minimal 6 karakter. Tautan Google tetap aktif.
          </p>
          <form onSubmit={simpanSandi} className="mt-4 grid gap-4">
            <Field label="Kata sandi lama">
              <Input
                type="password"
                value={sandi.lama}
                onChange={(e) => setSandi({ ...sandi, lama: e.target.value })}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Kata sandi baru" hint="minimal 6 karakter">
              <Input
                type="password"
                value={sandi.baru}
                onChange={(e) => setSandi({ ...sandi, baru: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Ulangi kata sandi baru">
              <Input
                type="password"
                value={sandi.ulang}
                onChange={(e) => setSandi({ ...sandi, ulang: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>

            {galatSandi ? (
              <p
                role="alert"
                className="rounded-brutal bg-cherry/60 px-3 py-2 text-sm font-bold"
              >
                {galatSandi}
              </p>
            ) : null}

            <Btn tone="ink" type="submit" className="w-full" disabled={sibukSandi}>
              {sibukSandi ? "Menyimpan…" : "Simpan kata sandi"}
            </Btn>
          </form>
        </Panel>
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}

export default function AkunPage() {
  return (
    <Suspense>
      <IsiAkun />
    </Suspense>
  );
}
