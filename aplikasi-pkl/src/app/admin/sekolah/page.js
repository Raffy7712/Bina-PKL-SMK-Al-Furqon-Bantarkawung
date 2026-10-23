"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Stat,
  PageHeader,
  Field,
  Input,
  Avatar,
  Modal,
  EmptyState,
  Toast,
  LoadingBlock,
  microCls,
} from "@/components/ui";
import {
  IconPlus,
  IconShield,
  IconGoogle,
  IconEdit,
  IconX,
} from "@/components/icons";
import { api, useApi } from "@/lib/api";

export default function AdminSekolahPage() {
  const q = useApi("/api/sekolah");
  const daftar = q.data?.sekolah ?? [];

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nama: "", email: "", sandi: "" });
  const [error, setError] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [hapus, setHapus] = useState(null);
  const [putus, setPutus] = useState(null);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3200);
  }

  function bukaTambah() {
    setForm({ nama: "", email: "", sandi: "" });
    setError("");
    setModal({ mode: "tambah" });
  }

  function bukaUbah(akun) {
    setForm({ nama: akun.nama, email: akun.email, sandi: "" });
    setError("");
    setModal({ mode: "ubah", akun });
  }

  async function simpan(e) {
    e.preventDefault();
    setError("");
    const nama = form.nama.trim();
    const email = form.email.trim();
    if (!nama) return setError("Nama pembimbing wajib diisi.");
    if (!email) return setError("Email wajib diisi.");
    if (modal?.mode === "tambah" && form.sandi.length < 6) {
      return setError("Kata sandi minimal 6 karakter.");
    }
    if (form.sandi && form.sandi.length < 6) {
      return setError("Kata sandi minimal 6 karakter.");
    }

    setSibuk(true);
    try {
      if (modal?.mode === "tambah") {
        const res = await api("/api/sekolah", { method: "POST", body: form });
        showToast(`+ Akun ${res.akun.nama} dibuat`);
      } else {
        const res = await api(`/api/sekolah/${modal.akun.id}`, {
          method: "PATCH",
          body: form,
        });
        showToast(`Akun ${res.akun.nama} diperbarui`);
      }
      setModal(null);
      q.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSibuk(false);
    }
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setSibuk(true);
    try {
      await api(`/api/sekolah/${hapus.id}`, { method: "DELETE" });
      showToast(`Akun ${hapus.nama} dihapus`);
      setHapus(null);
      q.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibuk(false);
    }
  }

  async function konfirmasiPutus() {
    if (!putus) return;
    setSibuk(true);
    try {
      await api("/api/akun/google-putus", {
        method: "POST",
        body: { userId: putus.id },
      });
      showToast(`Tautan Google ${putus.googleEmail} diputus`);
      setPutus(null);
      q.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibuk(false);
    }
  }

  const jmlGoogle = daftar.filter((a) => a.googleEmail).length;
  const siap = !q.loading && !q.error;

  const stats = [
    {
      label: "Akun Pembimbing",
      value: siap ? daftar.length : "-",
      sub: siap
        ? `${daftar.length} akun bisa verifikasi jurnal`
        : "menunggu data",
      tone: "bg-marine",
      icon: <IconShield size={18} />,
    },
    {
      label: "Google Tertaut",
      value: siap ? jmlGoogle : "-",
      sub: "akun bisa masuk tanpa sandi",
      tone: "bg-sun",
      icon: <IconGoogle size={18} />,
    },
    {
      label: "Sandi Saja",
      value: siap ? daftar.length - jmlGoogle : "-",
      sub: "masuk dengan email + sandi",
      tone: "bg-mint",
      icon: <IconShield size={18} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pembimbing Sekolah"
        desc="Akun guru yang mengesahkan jurnal dan menilai laporan."
        action={
          <Btn tone="pink" onClick={bukaTambah}>
            <IconPlus size={16} /> Tambah Akun
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {q.error ? (
        <Panel role="alert" tone="bg-cherry/40" className="mt-6 p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat akun
          </p>
          <p className="mt-1.5 text-sm font-semibold">{q.error.message}</p>
          <Btn tone="ink" size="sm" className="mt-3" onClick={q.reload}>
            Coba lagi
          </Btn>
        </Panel>
      ) : q.loading ? (
        <LoadingBlock label="Memuat akun pembimbing…" />
      ) : daftar.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Belum ada akun pembimbing sekolah"
            desc="Tambahkan minimal satu akun agar verifikasi tetap berjalan."
            action={
              <Btn tone="pink" onClick={bukaTambah}>
                <IconPlus size={16} /> Tambah Akun
              </Btn>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {daftar.map((a, i) => (
            <Panel
              key={a.id}
              tone={i % 3 === 0 ? "bg-grape" : i % 3 === 1 ? "bg-white" : "bg-sun/70"}
              className="flex flex-col p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <Avatar name={a.nama} />
                <div className="min-w-0 flex-1">
                  <p className={microCls(false)}>Pembimbing Sekolah</p>
                  <h3 className="font-display truncate text-lg leading-tight">
                    {a.nama}
                  </h3>
                  <p className="mt-0.5 truncate text-xs font-semibold text-ink/70">
                    {a.email}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.googleEmail ? (
                  <Badge tone="green">
                    <IconGoogle size={12} /> Google tertaut
                  </Badge>
                ) : (
                  <Badge tone="gray">Sandi saja</Badge>
                )}
              </div>

              {a.googleEmail ? (
                <p className="mt-2 truncate text-[11px] font-semibold text-ink/70">
                  Google: {a.googleEmail}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 pt-3">
                <Btn size="sm" tone="yellow" onClick={() => bukaUbah(a)}>
                  <IconEdit size={14} /> Ubah
                </Btn>
                {a.googleEmail ? (
                  <Btn size="sm" tone="white" onClick={() => setPutus(a)}>
                    <IconX size={14} /> Putuskan Google
                  </Btn>
                ) : null}
                <Btn size="sm" tone="white" onClick={() => setHapus(a)}>
                  <IconX size={14} /> Hapus
                </Btn>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {}
      <Modal
        open={!!modal}
        onClose={() => !sibuk && setModal(null)}
        title={modal?.mode === "tambah" ? "Tambah Akun Pembimbing" : "Ubah Akun Pembimbing"}
      >
        <form onSubmit={simpan} className="grid gap-4">
          <Field label="Nama Pembimbing">
            <Input
              data-autofocus
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="cth. Rina Marlina, S.Pd."
              required
            />
          </Field>
          <Field
            label="Email Akun"
            hint="Dipakai untuk masuk, bisa ditautkan ke Google di Akun & Keamanan."
          >
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="cth. rina@its-raffy.my.id"
              autoComplete="off"
              required
            />
          </Field>
          <Field
            label="Kata Sandi"
            hint={
              modal?.mode === "tambah"
                ? "Minimal 6 karakter."
                : "Kosongkan bila tidak ingin mengganti."
            }
          >
            <Input
              type="password"
              value={form.sandi}
              onChange={(e) => setForm({ ...form, sandi: e.target.value })}
              placeholder={modal?.mode === "tambah" ? "minimal 6 karakter" : "••••••••"}
              autoComplete="new-password"
              required={modal?.mode === "tambah"}
            />
          </Field>

          {modal?.mode === "ubah" && modal.akun.googleEmail ? (
            <p className="rounded-brutal border bg-paper px-3 py-2 text-xs font-semibold">
              Google tertaut: <b>{modal.akun.googleEmail}</b>. Bisa diputus dari
              kartu akun.
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-brutal bg-cherry/50 px-3 py-2 text-sm font-bold"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
            <Btn tone="ink" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan Akun"}
            </Btn>
            <Btn tone="white" onClick={() => setModal(null)} disabled={sibuk}>
              Batal
            </Btn>
          </div>
        </form>
      </Modal>

      {}
      <Modal open={!!hapus} onClose={() => !sibuk && setHapus(null)} title="Hapus Akun">
        {hapus ? (
          <div className="grid gap-4">
            <p className="text-sm font-semibold">
              Hapus akun <b>{hapus.nama}</b> ({hapus.email})? Tindakan ini tidak
              bisa dibatalkan.
            </p>
            {daftar.length <= 1 ? (
              <p className="rounded-brutal border bg-cherry/30 px-3 py-2 text-xs font-bold">
                Akun terakhir. Tambahkan pengganti sebelum menghapus.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="red" onClick={konfirmasiHapus} disabled={sibuk}>
                {sibuk ? "Menghapus…" : "Ya, hapus akun"}
              </Btn>
              <Btn tone="white" onClick={() => setHapus(null)} disabled={sibuk}>
                Batal
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      {}
      <Modal open={!!putus} onClose={() => !sibuk && setPutus(null)} title="Putuskan Google">
        {putus ? (
          <div className="grid gap-4">
            <p className="text-sm font-semibold">
              Putuskan tautan Google <b>{putus.googleEmail}</b> dari akun{" "}
              <b>{putus.nama}</b>? Login dengan sandi tetap berjalan; pembimbing
              bisa menghubungkan Google lain kapan saja.
            </p>
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="red" onClick={konfirmasiPutus} disabled={sibuk}>
                {sibuk ? "Memutus…" : "Ya, putuskan"}
              </Btn>
              <Btn tone="white" onClick={() => setPutus(null)} disabled={sibuk}>
                Batal
              </Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
