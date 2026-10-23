"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV } from "@/lib/nav";
import { ROLE_META } from "@/lib/mock";
import { api, useApi } from "@/lib/api";
import { useOverlay } from "@/lib/pintasan";
import { formatTanggalPanjang, useHariIni, waktuLalu } from "@/lib/tanggal";
import { Avatar, Panel } from "@/components/ui";
import SchoolLogo from "@/components/school-logo";
import {
  IconBell,
  IconMenu,
  IconLogout,
  IconSearch,
  IconX,
  IconArrow,
  IconUsers,
  IconBuilding,
  IconShield,
} from "@/components/icons";

const ROLE_TONES = {
  yellow: "bg-sun",
  green: "bg-mint",
  purple: "bg-grape",
  pink: "bg-candy",
};

function Logo() {
  return <SchoolLogo href="/" />;
}

function NavList({ role, pathname, onNavigate, lencana = {} }) {
  const items = NAV[role] ?? [];
  const home = items[0]?.href;
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-2">
      {items.map((item) => {
        const active =
          item.href === pathname ||
          (item.href !== home && pathname.startsWith(item.href + "/"));
        const Icon = item.icon;
        const jumlah = item.badge ? lencana[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-brutal px-3 py-2.5 text-[13.5px] transition-colors duration-150 ${
              active
                ? "bg-ink/[0.06] font-medium text-ink"
                : "font-normal text-ink/65 hover:bg-ink/[0.035] hover:text-ink"
            }`}
          >
            <Icon size={18} />
            <span className="flex-1">{item.label}</span>
            {jumlah ? (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${
                  active ? "bg-sun text-ink" : "bg-cherry text-ink"
                }`}
              >
                {jumlah}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ role, user, onNavigate, lencana }) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = ROLE_META[role];
  const nama = user?.nama ?? "";
  const sub = user?.sub ?? "";
  const [gagalKeluar, setGagalKeluar] = useState(false);

  async function logout() {
    setGagalKeluar(false);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setGagalKeluar(true);
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Logo />

      <Panel tone="bg-ink/[0.025]" className="flex items-center gap-3 p-3">
        <Avatar name={nama || "?"} size="md" src={user?.fotoUrl} />
        <div className="min-w-0 flex-1">
          {user ? (
            <>
              <p className="truncate text-sm font-medium leading-tight">{nama}</p>
              <p className="truncate text-xs text-ink/65">{sub}</p>
            </>
          ) : (
            <span className="grid gap-1.5" aria-label="Memuat profil">
              <span className="h-3 w-24 animate-pulse rounded bg-ink/10" />
              <span className="h-2.5 w-16 animate-pulse rounded bg-ink/[0.07]" />
            </span>
          )}
          <span className="mt-1 inline-block rounded-md bg-ink/[0.05] px-2 py-0.5 text-[11px] font-medium text-ink/65">
            {meta.label}
          </span>
        </div>
      </Panel>

      <div className="flex-1 overflow-y-auto">
        <NavList
          role={role}
          pathname={pathname}
          onNavigate={onNavigate}
          lencana={lencana}
        />
      </div>

      <Link
        href="/akun"
        onClick={onNavigate}
        aria-current={pathname === "/akun" ? "page" : undefined}
        className={`flex items-center gap-3 rounded-brutal px-3 py-2.5 text-[13.5px] transition-colors duration-150 ${
          pathname === "/akun"
            ? "bg-ink/[0.06] font-medium text-ink"
            : "font-normal text-ink/65 hover:bg-ink/[0.035] hover:text-ink"
        }`}
      >
        <IconShield size={18} />
        Akun &amp; Keamanan
      </Link>

      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-3 rounded-brutal px-3 py-2.5 text-[13.5px] font-normal text-ink/65 transition-colors duration-150 hover:bg-cherry/15 hover:text-ink"
      >
        <IconLogout size={18} />
        Keluar
      </button>
      {gagalKeluar ? (
        <p className="rounded-brutal bg-cherry/30 px-2 py-1.5 text-[11px] font-bold">
          Gagal keluar. Periksa koneksi lalu coba lagi.
        </p>
      ) : null}
    </div>
  );
}

function CommandPalette({ role, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useOverlay(true, onClose);

  const bolehSiswa = role === "admin" || role === "dudi";
  const bolehMitra = role === "admin" || role === "siswa";
  const siswaQ = useApi(bolehSiswa ? "/api/siswa" : null);
  const mitraQ = useApi(
    bolehMitra ? (role === "siswa" ? "/api/dudi?mine=1" : "/api/dudi") : null
  );
  const daftarSiswa = siswaQ.data?.siswa ?? null;
  const daftarMitraData = mitraQ.data?.dudi ?? null;

  const results = useMemo(() => {
    const all = [];

    for (const item of NAV[role] ?? []) {
      all.push({
        group: "Menu halaman",
        label: item.label,
        hint: "Buka halaman",
        href: item.href,
        icon: item.icon,
      });
    }

    if (bolehSiswa) {
      for (const s of daftarSiswa ?? []) {
        all.push({
          group: "Siswa",
          label: s.nama,
          hint: `NIS ${s.nis} · ${s.kelas ?? "-"}`,
          href: role === "admin" ? "/admin/siswa" : "/pembimbing-dudi/siswa",
          icon: IconUsers,
        });
      }
    }

    if (bolehMitra) {
      const list = Array.isArray(daftarMitraData)
        ? daftarMitraData
        : daftarMitraData
          ? [daftarMitraData]
          : [];
      for (const d of list) {
        all.push({
          group: "Mitra DUDI",
          label: d.nama,
          hint: `${d.bidang || "-"} · ${d.kota || "-"}`,
          href: role === "admin" ? "/admin/dudi" : "/siswa/lokasi",
          icon: IconBuilding,
        });
      }
    }

    const kata = q.trim().toLowerCase();
    const list = kata
      ? all.filter(
          (r) =>
            r.label.toLowerCase().includes(kata) ||
            r.hint.toLowerCase().includes(kata) ||
            r.group.toLowerCase().includes(kata)
        )
      : all.filter((r) => r.group === "Menu halaman");

    return list.slice(0, 8);
  }, [q, role, bolehSiswa, bolehMitra, daftarSiswa, daftarMitraData]);

  const pilihIdx = Math.min(sel, Math.max(0, results.length - 1));

  function go(href) {
    onClose();
    if (href !== pathname) router.push(href);
  }

  function onKeyDown(e) {
    const dariTombol = e.target?.tagName === "BUTTON";
    if (e.key === "ArrowDown") {
      if (!results.length) return;
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && !dariTombol) {
      e.preventDefault();
      if (results[pilihIdx]) go(results[pilihIdx].href);
    }
  }

  let lastGroup = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/50 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      {}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian cepat"
        className="w-full max-w-xl animate-pop overflow-hidden rounded-brutal bg-white shadow-brutal-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-ink/15 px-4 py-3.5">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder="Cari menu, siswa, atau mitra…"
            className="w-full bg-transparent text-base font-normal placeholder:text-ink/65 focus:outline-none"
          />
          <kbd className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink/65">
            Esc
          </kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm font-normal text-ink/65">
              Tidak ada hasil untuk “{q}”
            </li>
          ) : (
            results.map((r, i) => {
              const showGroup = r.group !== lastGroup;
              lastGroup = r.group;
              const Icon = r.icon;
              return (
                <li key={`${r.group}-${r.label}-${i}`}>
                  {showGroup ? (
                    <p className="px-3 pb-1 pt-3 text-[11px] font-medium text-ink/65">
                      {r.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    ref={i === pilihIdx ? (el) => el?.scrollIntoView({ block: "nearest" }) : null}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(r.href)}
                    className={`flex w-full items-center gap-3 rounded-brutal border px-3 py-2 text-left transition-colors ${
                      i === pilihIdx
                        ? "border-ink/15 bg-paper"
                        : "border-transparent hover:bg-paper"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink/[0.05]">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {r.label}
                      </span>
                      <span className="block truncate text-xs font-normal text-ink/60">
                        {r.hint}
                      </span>
                    </span>
                    <IconArrow size={14} />
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-ink/15 bg-paper px-4 py-2 text-[10px] font-bold tracking-wide text-ink/65">
          <span>↑↓ pilih</span>
          <span>↵ buka</span>
          <span>esc tutup</span>
        </div>
      </div>
    </div>
  );
}

const NOTIF_TONE = {
  jurnal: "bg-sun",
  laporan: "bg-mint",
  pengingat: "bg-candy",
  pesan: "bg-marine",
  sistem: "bg-white",
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const ref = useRef(null);
  const notifQ = useApi("/api/notifikasi");
  const { reload: muatNotif } = notifQ;

  const items = notifQ.data?.notifikasi ?? [];
  const unread = notifQ.data?.belumDibaca ?? 0;

  useEffect(() => {
    const t = setInterval(() => muatNotif(), 60000);
    return () => clearInterval(t);
  }, [muatNotif]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useOverlay(open, () => setOpen(false));

  useEffect(() => {
    const onFokus = () => muatNotif();
    window.addEventListener("focus", onFokus);
    document.addEventListener("visibilitychange", onFokus);
    return () => {
      window.removeEventListener("focus", onFokus);
      document.removeEventListener("visibilitychange", onFokus);
    };
  }, [muatNotif]);

  function togglePanel() {
    const buka = !open;
    setOpen(buka);
    if (!buka) return;
    muatNotif();
    if (unread > 0) void tandai();
  }

  async function tandai(id) {
    try {
      setSibuk(true);
      await api("/api/notifikasi/baca", {
        method: "POST",
        body: id ? { id } : { semua: true },
      });
      muatNotif();
    } catch {
    } finally {
      setSibuk(false);
    }
  }

  const lihat = (n) => {
    setOpen(false);
    if (!n.dibaca) void tandai(n.id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notifikasi${unread ? ` (${unread} baru)` : ""}`}
        aria-expanded={open}
        onClick={togglePanel}
        className="relative grid h-11 w-11 place-items-center rounded-brutal bg-sun transition-colors hover:bg-sun/80 active:opacity-90"
      >
        <IconBell size={18} />
        {unread ? (
          <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-cherry text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-13 z-40 w-80 max-w-[calc(100vw-2rem)] animate-pop">
          <Panel className="overflow-hidden p-0 shadow-brutal">
            <div className="flex items-center justify-between border-b border-ink/15 bg-sun px-3 py-2">
              <span className="text-xs font-bold tracking-wide">
                Notifikasi
              </span>
              {unread ? (
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() => tandai()}
                  className="inline-flex min-h-11 items-center px-2 text-[10px] font-bold underline decoration-2 underline-offset-2 disabled:opacity-50"
                >
                  Tandai semua dibaca
                </button>
              ) : null}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifQ.loading ? (
                <li className="px-3 py-6 text-center text-xs font-semibold text-ink/65">
                  Memuat…
                </li>
              ) : items.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs font-semibold text-ink/65">
                  Belum ada notifikasi.
                </li>
              ) : (
                items.map((n) => {
                  const isi = (
                    <>
                      <span
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                          NOTIF_TONE[n.jenis] ?? "bg-white"
                        }`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-xs font-bold leading-snug ${
                            n.dibaca ? "opacity-55" : ""
                          }`}
                        >
                          {n.judul}
                        </span>
                        {n.pesan ? (
                          <span className="mt-0.5 block text-[11px] font-medium leading-snug text-ink/70">
                            {n.pesan}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] font-bold tracking-wide text-ink/65">
                          {waktuLalu(n.dibuat)}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={n.id} className="border-b-2 border-ink/10 last:">
                      {n.tautan ? (
                        <Link
                          href={n.tautan}
                          onClick={() => lihat(n)}
                          className="flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-sun/40"
                        >
                          {isi}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => lihat(n)}
                          className="flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-sun/40"
                        >
                          {isi}
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function Topbar({ role, onOpenMenu, onOpenPalette }) {
  const meta = ROLE_META[role];
  const hariIni = useHariIni();
  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-white/95 backdrop-blur print:hidden">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu navigasi"
          className="grid h-11 w-11 place-items-center rounded-brutal bg-ink/[0.04] transition-colors hover:bg-ink/[0.08] md:hidden"
        >
          <IconMenu size={18} />
        </button>

        {}
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden min-h-11 max-w-md flex-1 items-center gap-2 rounded-brutal bg-ink/[0.04] px-4 py-2 text-left transition-colors hover:bg-ink/[0.07] sm:flex"
        >
          <IconSearch size={16} />
          <span className="flex-1 text-sm font-medium text-ink/65">
            Cari menu, siswa, atau mitra…
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Pencarian cepat"
          className="grid h-11 w-11 place-items-center rounded-brutal bg-ink/[0.04] transition-colors hover:bg-ink/[0.08] sm:hidden"
        >
          <IconSearch size={18} />
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden rounded-brutal bg-ink/[0.04] px-3 py-1.5 text-xs font-normal text-ink/70 md:inline-block">
            {hariIni ? formatTanggalPanjang(hariIni) : ""}
          </span>
          <NotificationBell />
          <p className="hidden text-xs font-normal text-ink/65 lg:block">
            {meta.label}
          </p>
        </div>
      </div>
    </header>
  );
}

export default function Shell({ role, children }) {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const { data: me, error: meError, reload: muatMe } = useApi("/api/auth/me");
  const ringkasQ = useApi(role === "siswa" ? null : "/api/ringkas");

  useEffect(() => {
    if (meError?.status === 401) router.replace("/login");
  }, [meError, router]);

  useEffect(() => {
    const segarkan = () => muatMe();
    window.addEventListener("pkl-profil-berubah", segarkan);
    return () => window.removeEventListener("pkl-profil-berubah", segarkan);
  }, [muatMe]);

  useOverlay(open, () => setOpen(false));

  const lencana = useMemo(() => {
    const r = ringkasQ.data;
    if (!r) return {};
    const out = {};
    const verif =
      role === "dudi" ? r.jurnal?.menunggu_dudi : r.jurnal?.menunggu_sekolah;
    if (verif) out.verif = verif;
    if (role === "sekolah" && r.laporan?.terkirim) out.laporan = r.laporan.terkirim;
    return out;
  }, [ringkasQ.data, role]);

  return (
    <div className="flex min-h-screen">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-brutal focus:border focus:border-ink focus:bg-sun focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:focus:shadow-brutal"
      >
        Lompat ke konten
      </a>

      {}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-ink/[0.07] bg-white print:hidden md:block">
        <SidebarContent
          role={role}
          user={me?.user}
          onNavigate={() => setOpen(false)}
          lencana={lencana}
        />
      </aside>

      {}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-ink/[0.07] bg-white shadow-[0_10px_40px_rgba(14,26,24,0.18)]">
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-brutal bg-ink/[0.05]"
            >
              <IconX size={16} />
            </button>
            <SidebarContent
              role={role}
              user={me?.user}
              onNavigate={() => setOpen(false)}
              lencana={lencana}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={role}
          onOpenMenu={() => setOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main id="konten" className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="border-t border-ink/[0.07] px-6 py-5 text-center text-xs text-ink/65 print:hidden">
          Bina-PKL · SMK Al Furqon Bantarkawung
        </footer>
      </div>

      {paletteOpen ? (
        <CommandPalette role={role} onClose={() => setPaletteOpen(false)} />
      ) : null}
    </div>
  );
}
