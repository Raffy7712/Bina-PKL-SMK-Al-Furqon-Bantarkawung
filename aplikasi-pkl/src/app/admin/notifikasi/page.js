"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Chip,
  PageHeader,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
  TableWrap,
  Th,
  Td,
  trCls,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import { IconSend, IconBell, IconBellRing, IconClock } from "@/components/icons";
import { useApi, api } from "@/lib/api";
import { waktuLalu } from "@/lib/tanggal";

const TEMPLATE = {
  kosong: "",
  pengingat:
    "Halo {nama}, jurnal harian PKL kamu hari ini belum diisi. Mohon segera mengisi jurnal, ya.",
  info: "Halo {nama}, ada informasi dari pembimbing sekolah: ",
};

const STATUS_WA = {
  terkirim: { label: "Terkirim", tone: "green" },
  gagal: { label: "Gagal", tone: "red" },
  menunggu: { label: "Menunggu", tone: "yellow" },
  tanpa_nomor: { label: "Tanpa nomor", tone: "gray" },
  nomor_tidak_valid: { label: "Nomor salah", tone: "red" },
};

const MODE_LABEL = {
  siswa: "Satu Siswa",
  dudi: "Satu Mitra DUDI",
  "pengingat-jurnal": "Pengingat Massal",
};

function detikKeTeks(d) {
  if (d == null) return "-";
  const jam = Math.floor(d / 3600);
  const menit = Math.floor((d % 3600) / 60);
  if (jam) return `${jam} jam ${menit} mnt`;
  if (menit) return `${menit} mnt`;
  return `${d} dtk`;
}

export default function AdminNotifikasiPage() {
  const botQ = useApi("/api/wa/status");
  const siswaQ = useApi("/api/siswa");
  const dudiQ = useApi("/api/dudi");
  const logQ = useApi("/api/notifikasi/log?limit=50");
  const pengQ = useApi("/api/pengaturan/pengingat");

  const [mode, setMode] = useState("siswa");
  const [targetId, setTargetId] = useState("");
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [sibukPeng, setSibukPeng] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3600);
  }

  const bot = botQ.data;
  const siswaList = siswaQ.data?.siswa ?? [];
  const dudiList = dudiQ.data?.dudi ?? [];
  const log = logQ.data?.notifikasi ?? [];
  const pengaturan = pengQ.data?.pengaturan ?? null;
  const terakhirPeng = pengQ.data?.terakhir ?? null;

  function gantiMode(m) {
    setMode(m);
    setTargetId("");
    setHasil(null);
    if (m === "pengingat-jurnal") setPesan(TEMPLATE.pengingat);
    else setPesan("");
  }

  async function kirim(e) {
    e.preventDefault();
    if (mode !== "pengingat-jurnal" && !targetId) {
      showToast("Pilih penerima dulu.");
      return;
    }
    setBusy(true);
    setHasil(null);
    try {
      const body = { mode, pesan: pesan.trim() };
      if (mode !== "pengingat-jurnal") body.id = targetId;
      const res = await api("/api/notifikasi/kirim", { method: "POST", body });
      setHasil(res);
      logQ.reload();
      if (res.total === 0) {
        showToast("Tidak ada penerima yang cocok.");
      } else {
        showToast(
          `Selesai: ${res.terkirim} terkirim` +
            (res.tanpaNomor ? ` · ${res.tanpaNomor} tanpa nomor` : "") +
            (res.gagal ? ` · ${res.gagal} gagal` : "") +
            (res.dilewati ? ` · ${res.dilewati} dilewati (kuota bot)` : "")
        );
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function simpanJadwal(patch) {
    setSibukPeng(true);
    try {
      await api("/api/pengaturan/pengingat", { method: "PATCH", body: patch });
      pengQ.reload();
      showToast("Jadwal pengingat disimpan.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibukPeng(false);
    }
  }

  async function jalankanSekarang() {
    setSibukPeng(true);
    setHasil(null);
    try {
      const res = await api("/api/pengaturan/pengingat", {
        method: "POST",
        body: { jalankan: true },
      });
      const h = res.hasil ?? {};
      if (h.alasan) {
        showToast(
          h.alasan === "sudah_dijalankan_hari_ini"
            ? "Pengingat otomatis hari ini sudah dijalankan."
            : `Pengingat belum dijalankan (${h.alasan}).`
        );
      } else {
        showToast(
          `Pengingat otomatis: ${h.terkirim ?? 0} WA terkirim · ${h.tanpaNomor ?? 0} tanpa nomor`
        );
      }
      pengQ.reload();
      logQ.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSibukPeng(false);
    }
  }

  const online = Boolean(bot?.online);
  const waSiap = bot?.whatsapp === "connected";

  return (
    <div>
      <PageHeader
        title="Pusat Notifikasi"
        desc="Pesan keluar ke siswa dan mitra, lewat WhatsApp dan lonceng aplikasi."
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {}
        <Panel className="p-4 sm:p-5">
          <h2 className="font-display text-xl">Kirim Pesan</h2>
          <form onSubmit={kirim} className="mt-4 grid gap-4">
            <Field label="Jenis Penerima">
              <Select value={mode} onChange={(e) => gantiMode(e.target.value)}>
                {Object.entries(MODE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            {mode === "siswa" ? (
              <Field
                label="Siswa"
                hint="Nomornya diambil dari Data Siswa."
              >
                <Select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={siswaQ.loading}
                >
                  <option value="">
                    {siswaQ.loading ? "Memuat siswa…" : "- pilih siswa -"}
                  </option>
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} · {s.nis}
                      {s.telepon ? ` · ${s.telepon}` : " · (tanpa nomor)"}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {mode === "dudi" ? (
              <Field label="Mitra DUDI" hint="Nomor diambil dari kolom kontak mitra.">
                <Select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={dudiQ.loading}
                >
                  <option value="">
                    {dudiQ.loading ? "Memuat mitra…" : "- pilih mitra -"}
                  </option>
                  {dudiList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                      {d.kontak ? ` · ${d.kontak}` : " · (tanpa kontak)"}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {mode === "pengingat-jurnal" ? (
              <Panel tone="bg-sun/60" className="p-3">
                <p className="text-xs font-semibold leading-snug">
                  Sasaran: siswa bermitra yang belum menulis jurnal hari ini.
                  Tanpa nomor WA, pesan tetap masuk lonceng aplikasi. Bot
                  membatasi ±30 kirim/menit, sisanya dilewati.
                </p>
              </Panel>
            ) : null}

            <Field
              label="Isi Pesan"
              hint="{nama} diganti nama penerima. Kosongkan untuk pesan standar."
            >
              <Textarea
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Tulis pesan…"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Chip onClick={() => setPesan(TEMPLATE.pengingat)}>Pengingat jurnal</Chip>
              <Chip onClick={() => setPesan(TEMPLATE.info)}>Info umum</Chip>
              <Chip onClick={() => setPesan("")}>Kosongkan</Chip>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="pink" type="submit" disabled={busy}>
                <IconSend size={16} /> {busy ? "Mengirim…" : "Kirim WhatsApp"}
              </Btn>
              {mode !== "pengingat-jurnal" && targetId ? (
                <span className="text-xs font-semibold text-ink/65">
                  ke:{" "}
                  {mode === "siswa"
                    ? siswaList.find((s) => s.id === targetId)?.nama
                    : dudiList.find((d) => d.id === targetId)?.nama}
                </span>
              ) : null}
            </div>
          </form>
        </Panel>

        <div className="grid content-start gap-5">
          {}
          <Panel className="overflow-hidden">
            <div
              className={`flex items-center justify-between gap-3 border-b border-ink/15 px-4 py-3 ${
                waSiap ? "bg-mint" : online ? "bg-sun" : "bg-cherry"
              }`}
            >
              <h2 className="font-display flex items-center gap-2 text-lg">
                <IconBellRing size={18} />
                Bot WhatsApp
              </h2>
              <Badge tone={waSiap ? "green" : online ? "yellow" : "red"}>
                {waSiap ? "Terhubung" : online ? "Tidak siap" : "Mati"}
              </Badge>
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              {botQ.loading ? (
                <p className="text-sm font-semibold text-ink/65">Memeriksa bot…</p>
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Alamat bot
                      </dt>
                      <dd className="mt-0.5 break-all">{bot?.url ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Status WhatsApp
                      </dt>
                      <dd className="mt-0.5">{bot?.whatsapp ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Antrean
                      </dt>
                      <dd className="mt-0.5">{bot?.queueSize ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Sisa kuota / menit
                      </dt>
                      <dd className="mt-0.5">{bot?.rateRemaining ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Aktif sejak
                      </dt>
                      <dd className="mt-0.5">{detikKeTeks(bot?.uptimeSeconds)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold tracking-wide text-ink/65">
                        Token API
                      </dt>
                      <dd className="mt-0.5">
                        {bot?.tokenDiatur ? "Terpasang" : "Belum diatur"}
                      </dd>
                    </div>
                  </dl>
                  {!online && bot?.error ? (
                    <p className="rounded-brutal bg-cherry/40 px-3 py-2 text-xs font-semibold">
                      {bot.error}
                    </p>
                  ) : null}
                  {!bot?.tokenDiatur ? (
                    <p className="rounded-brutal bg-sun/60 px-3 py-2 text-xs font-semibold">
                      Isi <code className="font-bold">WA_BOT_TOKEN</code> di{" "}
                      <code className="font-bold">.env.local</code> lalu jalankan
                      ulang server agar pesan bisa dikirim.
                    </p>
                  ) : null}
                  <div>
                    <Btn size="sm" tone="white" onClick={() => botQ.reload()}>
                      Segarkan status
                    </Btn>
                  </div>
                </>
              )}
            </div>
          </Panel>

          {}
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-grape px-4 py-3">
              <h2 className="font-display flex items-center gap-2 text-lg">
                <IconClock size={18} /> Pengingat Otomatis
              </h2>
              {pengaturan ? (
                <Badge tone={pengaturan.aktif ? "green" : "gray"}>
                  {pengaturan.aktif ? "Aktif" : "Nonaktif"}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              {pengQ.loading ? (
                <p className="text-sm font-semibold text-ink/65">Memuat jadwal…</p>
              ) : !pengaturan ? (
                <p className="text-sm font-semibold text-ink/65">
                  Gagal memuat jadwal pengingat.
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold leading-snug text-ink/70">
                    Pukul <b>{String(pengaturan.jam).padStart(2, "0")}.00</b>{" "}
                    waktu server, siswa bermitra yang belum menulis jurnal
                    diingatkan sekali, lewat WhatsApp dan lonceng aplikasi.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <Btn
                      size="sm"
                      tone={pengaturan.aktif ? "white" : "yellow"}
                      onClick={() => simpanJadwal({ aktif: !pengaturan.aktif })}
                      disabled={sibukPeng}
                    >
                      {pengaturan.aktif ? "Matikan" : "Aktifkan"}
                    </Btn>
                    <label className="flex items-center gap-2 text-[11px] font-bold tracking-wide">
                      Jam
                      <Select
                        value={pengaturan.jam}
                        onChange={(e) => simpanJadwal({ jam: Number(e.target.value) })}
                        disabled={sibukPeng}
                        className="!w-24 !py-1.5"
                      >
                        {Array.from({ length: 24 }, (_, j) => (
                          <option key={j} value={j}>
                            {String(j).padStart(2, "0")}.00
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-ink/65">
                      Hari pengingat
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                        (nama, i) => (
                          <Chip
                            key={nama}
                            active={pengaturan.hari.includes(i)}
                            onClick={() => {
                              const baru = pengaturan.hari.includes(i)
                                ? pengaturan.hari.filter((h) => h !== i)
                                : [...pengaturan.hari, i].sort((a, b) => a - b);
                              simpanJadwal({ hari: baru });
                            }}
                          >
                            {nama}
                          </Chip>
                        )
                      )}
                    </div>
                  </div>

                  {terakhirPeng ? (
                    <p className="rounded-brutal bg-mint/60 px-3 py-2 text-[11px] font-semibold">
                      Terakhir dijalankan {terakhirPeng.tanggal} ·{" "}
                      {terakhirPeng.terkirim ?? 0} WA terkirim,{" "}
                      {terakhirPeng.tanpaNomor ?? 0} tanpa nomor,{" "}
                      {terakhirPeng.total ?? 0} penerima.
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-ink/65">
                      Belum pernah dijalankan otomatis.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Btn
                      size="sm"
                      tone="ink"
                      onClick={jalankanSekarang}
                      disabled={sibukPeng}
                    >
                      <IconSend size={14} />{" "}
                      {sibukPeng ? "Menjalankan…" : "Jalankan sekarang"}
                    </Btn>
                    <span className="text-[11px] font-semibold text-ink/65">
                      Tetap menghormati aturan sekali per hari.
                    </span>
                  </div>
                </>
              )}
            </div>
          </Panel>

          {}
          {hasil ? (
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-sun px-4 py-3">
                <h2 className="font-display text-lg">Hasil Pengiriman</h2>
                <Badge tone="white">{hasil.total} penerima</Badge>
              </div>
              <div className="grid gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="green">{hasil.terkirim} terkirim</Badge>
                  {hasil.tanpaNomor ? (
                    <Badge tone="gray">{hasil.tanpaNomor} tanpa nomor</Badge>
                  ) : null}
                  {hasil.gagal ? <Badge tone="red">{hasil.gagal} gagal</Badge> : null}
                  {hasil.dilewati ? (
                    <Badge tone="yellow">{hasil.dilewati} dilewati</Badge>
                  ) : null}
                </div>
                {hasil.hasil?.length ? (
                  <ul className="max-h-56 overflow-y-auto text-xs font-semibold">
                    {hasil.hasil.map((h, i) => (
                      <li
                        key={`${h.nama}-${i}`}
                        className="flex items-center justify-between gap-3 border-b-2 border-ink/10 py-1.5 last:"
                      >
                        <span className="min-w-0 truncate">{h.nama}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-ink/65">{h.nomor ?? "-"}</span>
                          <Badge tone={STATUS_WA[h.status]?.tone ?? "white"}>
                            {STATUS_WA[h.status]?.label ?? h.status}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-ink/65">
                    Tidak ada penerima yang cocok.
                  </p>
                )}
                {hasil.hasil?.some((h) => h.error) ? (
                  <p className="text-[11px] font-semibold text-cherry">
                    {hasil.hasil.find((h) => h.error)?.error}
                  </p>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      {}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-marine px-4 py-3">
          <h2 className="font-display flex items-center gap-2 text-lg text-white">
            <IconBell size={18} /> Log Pengiriman WhatsApp
          </h2>
          <Btn size="sm" tone="white" onClick={() => logQ.reload()}>
            Muat ulang
          </Btn>
        </div>
        <div className="p-4 sm:p-5">
          {logQ.loading ? (
            <LoadingBlock label="Memuat log…" />
          ) : log.length === 0 ? (
            <EmptyState
              title="Belum ada pengiriman"
              desc="Pesan otomatis dan manual tercatat di sini."
            />
          ) : (
            <TableWrap>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr>
                    <Th className="w-28">Waktu</Th>
                    <Th className="w-44">Tujuan</Th>
                    <Th>Pesan</Th>
                    <Th className="w-36">Nomor</Th>
                    <Th className="w-28">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((n) => (
                    <tr key={n.id} className={trCls}>
                      <Td className="text-xs font-semibold text-ink/70">
                        <span title={n.dibuat}>{waktuLalu(n.dibuat)}</span>
                      </Td>
                      <Td className="text-xs font-bold">{n.tujuan ?? "-"}</Td>
                      <Td>
                        <p className="text-xs font-bold leading-snug">{n.judul}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink/65">
                          {(n.pesan ?? "").split("\n")[0]}
                        </p>
                      </Td>
                      <Td className="text-xs font-semibold">{n.waNomor ?? "-"}</Td>
                      <Td>
                        <Badge tone={STATUS_WA[n.waStatus]?.tone ?? "white"}>
                          {STATUS_WA[n.waStatus]?.label ?? n.waStatus ?? "-"}
                        </Badge>
                        {n.waError && n.waStatus !== "terkirim" ? (
                          <p className="mt-1 text-[10px] font-semibold leading-snug text-cherry">
                            {n.waError}
                          </p>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      </Panel>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
