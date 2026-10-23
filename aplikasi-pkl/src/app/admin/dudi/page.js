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
  Textarea,
  Avatar,
  Modal,
  Toast,
  Spinner,
  microCls,
} from "@/components/ui";
import {
  IconPlus,
  IconBuilding,
  IconUsers,
  IconPin,
  IconClock,
  IconEdit,
  IconX,
  IconShield,
} from "@/components/icons";
import { useApi, api } from "@/lib/api";
import PetaLeaflet from "@/components/peta-leaflet";

function FormMitra({
  awal,
  awalLokasi = null,
  akun = null,
  labelSimpan,
  pending,
  onSimpan,
  onBatal,
  onPutusGoogle,
}) {
  const [form, setForm] = useState(awal);
  const [lokasi, setLokasi] = useState(awalLokasi);
  const [lokasiState, setLokasiState] = useState({ status: "idle", error: "" });

  async function cariLokasi(e) {
    e?.preventDefault();
    if (!form.mapsUrl.trim()) return;
    setLokasiState({ status: "mencari", error: "" });
    try {
      const res = await api("/api/geocode", {
        method: "POST",
        body: { q: form.mapsUrl.trim() },
      });
      setLokasi(res.lokasi);
      setLokasiState({ status: "ok", error: "" });
    } catch (err) {
      setLokasi(null);
      setLokasiState({ status: "error", error: err.message });
    }
  }

  function pilihManual(koord) {
    setLokasi((l) => ({
      lat: koord.lat,
      lng: koord.lng,
      label: l?.label ?? null,
      source: l?.source ?? "manual",
    }));
    setLokasiState({ status: "ok", error: "" });
  }

  function submit(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    onSimpan({
      ...form,
      mapsUrl: form.mapsUrl.trim(),
      lat: lokasi?.lat,
      lng: lokasi?.lng,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Mitra">
          <Input
            data-autofocus
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="cth. PT Karya Anak Bangsa"
            required
          />
        </Field>
        <Field label="Bidang Usaha">
          <Input
            value={form.bidang}
            onChange={(e) => setForm({ ...form, bidang: e.target.value })}
            placeholder="cth. Software House"
          />
        </Field>
      </div>

      <Field label="Alamat">
        <Textarea
          rows={2}
          value={form.alamat}
          onChange={(e) => setForm({ ...form, alamat: e.target.value })}
          placeholder="Jalan, nomor, kecamatan, kota…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kota / Kabupaten">
          <Input
            value={form.kota}
            onChange={(e) => setForm({ ...form, kota: e.target.value })}
            placeholder="cth. Brebes"
          />
        </Field>
        <Field label="Nama Pembimbing DUDI">
          <Input
            value={form.pembimbing}
            onChange={(e) => setForm({ ...form, pembimbing: e.target.value })}
            placeholder="cth. Bagas Pratama"
          />
        </Field>
        <Field label="Kontak / Telepon">
          <Input
            value={form.kontak}
            onChange={(e) => setForm({ ...form, kontak: e.target.value })}
            placeholder="cth. 0812-3456-7890"
          />
        </Field>
        <Field label="Jam Praktik">
          <Input
            value={form.jam}
            onChange={(e) => setForm({ ...form, jam: e.target.value })}
            placeholder="cth. 07.30 – 16.00"
          />
        </Field>
        <Field
          label="Radius check-in (meter)"
          hint="Check-in GPS hanya diterima di dalam radius ini (10 sampai 5000 m)."
        >
          <Input
            type="number"
            min="10"
            max="5000"
            step="10"
            value={form.radiusM}
            onChange={(e) => setForm({ ...form, radiusM: e.target.value })}
            placeholder="100"
          />
        </Field>
      </div>

      {}
      <div className="rounded-brutal bg-paper p-3">
        <p className="text-[11px] font-bold tracking-wide text-ink/70">
          <IconShield size={12} className="inline" /> Akun login pembimbing DUDI
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-ink/65">
          {akun
            ? "Kosongkan bila tidak ingin mengganti."
            : "Akun ini dipakai pembimbing untuk verifikasi jurnal."}
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field label="Email Akun">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="cth. pembimbing@mitra.id"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Kata Sandi"
            hint={akun ? "kosongkan bila tetap" : "minimal 6 karakter"}
          >
            <Input
              type="password"
              value={form.sandi}
              onChange={(e) => setForm({ ...form, sandi: e.target.value })}
              placeholder={akun ? "••••••••" : "minimal 6 karakter"}
              autoComplete="new-password"
            />
          </Field>
        </div>
        {akun ? (
          akun.googleEmail ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-brutal border bg-white px-3 py-2">
              <p className="text-[11px] font-bold">
                Google tertaut: {akun.googleEmail}
              </p>
              <Btn
                size="sm"
                tone="white"
                type="button"
                onClick={() => onPutusGoogle?.(akun)}
              >
                <IconX size={12} /> Putuskan Google
              </Btn>
            </div>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-ink/65">
              Belum ada akun Google yang dihubungkan pembimbing ini.
            </p>
          )
        ) : null}
      </div>

      {}
      <div className="rounded-brutal bg-paper p-3">
        <p className="text-[11px] font-bold tracking-wide text-ink/70">
          <IconPin size={12} className="inline" /> Lokasi mitra (Google Maps)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            value={form.mapsUrl}
            onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cariLokasi();
              }
            }}
            placeholder="Tempel link Google Maps, mis. https://maps.app.goo.gl/…"
            className="min-w-0 flex-1 !text-sm"
          />
          <Btn
            tone="ink"
            size="sm"
            type="button"
            onClick={cariLokasi}
            disabled={lokasiState.status === "mencari"}
          >
            {lokasiState.status === "mencari" ? (
              <>
                <Spinner size={14} /> Mencari…
              </>
            ) : (
              <>Cari di Peta</>
            )}
          </Btn>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-ink/65">
          Bisa link Google Maps (termasuk maps.app.goo.gl), koordinat
          &quot;lat, lng&quot;, atau nama alamat. Klik peta untuk memperbaiki
          titik pin.
        </p>

        {lokasiState.status === "error" ? (
          <p
            role="alert"
            className="mt-2 rounded-brutal bg-cherry/50 px-3 py-2 text-xs font-bold"
          >
            {lokasiState.error}
          </p>
        ) : null}

        {lokasi ? (
          <div className="mt-3">
            <PetaLeaflet
              center={{ lat: lokasi.lat, lng: lokasi.lng }}
              zoom={16}
              height={200}
              interaktif={false}
              onPilih={pilihManual}
              markers={[
                {
                  lat: lokasi.lat,
                  lng: lokasi.lng,
                  warna: "#02826d",
                  label: lokasi.label || "Titik mitra",
                },
              ]}
            />
            <p className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold tracking-wide text-ink/70">
              <span>
                <IconPin size={12} className="inline" /> {lokasi.lat},{" "}
                {lokasi.lng}
              </span>
              <span className="rounded-full bg-white px-2 py-px normal-case">
                {lokasi.label || lokasi.source}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
        <Btn tone="ink" type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : labelSimpan}
        </Btn>
        <Btn tone="white" onClick={onBatal} disabled={pending}>
          Batal
        </Btn>
      </div>
    </form>
  );
}

const FORM_KOSONG = {
  nama: "",
  bidang: "",
  alamat: "",
  kota: "",
  pembimbing: "",
  kontak: "",
  jam: "",
  radiusM: "100",
  mapsUrl: "",
  email: "",
  sandi: "",
};

export default function AdminDudiPage() {
  const { data, loading, error, reload } = useApi("/api/dudi");
  const dudi = data?.dudi ?? [];

  const [openAdd, setOpenAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3200);
  }

  async function tambahMitra(body) {
    setPending(true);
    try {
      const res = await api("/api/dudi", { method: "POST", body });
      setOpenAdd(false);
      showToast(`+ Mitra "${res.dudi.nama}" ditambahkan`);
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  async function simpanMitra(body) {
    if (!edit) return;
    setPending(true);
    try {
      const res = await api(`/api/dudi/${edit.id}`, { method: "PATCH", body });
      setEdit(null);
      showToast(`Mitra "${res.dudi.nama}" diperbarui`);
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  async function hapusMitra() {
    if (!hapus) return;
    setBusy(true);
    try {
      const res = await api(`/api/dudi/${hapus.id}`, { method: "DELETE" });
      showToast(
        `Mitra "${hapus.nama}" dihapus` +
          (res.akunDihapus ? ` · ${res.akunDihapus} akun pembimbing ikut terhapus` : "")
      );
      setHapus(null);
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function putusGoogle(akun) {
    if (!akun?.id) return;
    if (
      !window.confirm(
        `Putuskan tautan Google (${akun.googleEmail ?? "-"}) dari akun pembimbing ini?`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api("/api/akun/google-putus", {
        method: "POST",
        body: { userId: akun.id },
      });
      showToast("Tautan Google akun pembimbing diputus");
      setEdit((e) => (e ? { ...e, akun: { ...e.akun, googleEmail: null } } : e));
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const totalSiswa = dudi.reduce((a, d) => a + (d.jmlSiswa || 0), 0);
  const totalKota = new Set(dudi.map((d) => d.kota).filter(Boolean)).size;
  const siap = !loading && !error;

  const stats = [
    {
      label: "Total Mitra",
      value: siap ? dudi.length : "-",
      sub: siap ? `${dudi.length} mitra terdaftar` : "menunggu data",
      tone: "bg-marine",
      icon: <IconBuilding size={18} />,
    },
    {
      label: "Siswa Terpasang",
      value: siap ? totalSiswa : "-",
      sub: siap ? "siswa PKL di DUDI mitra" : "menunggu data",
      tone: "bg-sun",
      icon: <IconUsers size={18} />,
    },
    {
      label: "Kota Terlayani",
      value: siap ? totalKota : "-",
      sub:
        siap && totalKota
          ? dudi
              .map((d) => d.kota)
              .filter((k, i, arr) => k && arr.indexOf(k) === i)
              .join(" · ")
          : "-",
      tone: "bg-mint",
      icon: <IconPin size={18} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Mitra DUDI"
        desc="Tempat siswa praktik, beserta lokasi dan radius check-in."
        action={
          <Btn tone="pink" onClick={() => setOpenAdd(true)}>
            <IconPlus size={16} /> Tambah Mitra
          </Btn>
        }
      />

      {}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {error ? (
        <Panel role="alert" tone="bg-cherry/40" className="mt-6 p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat mitra
          </p>
          <p className="mt-1.5 text-sm font-semibold">{error.message}</p>
          <Btn tone="ink" size="sm" className="mt-3" onClick={reload}>
            Coba lagi
          </Btn>
        </Panel>
      ) : loading ? (
        <div className="mt-6 flex items-center gap-3">
          <Spinner /> <span className="text-[11px] font-bold tracking-wide text-ink/70">Memuat mitra…</span>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dudi.map((d) => {
            const gelap = d.tone === "bg-marine" || d.tone === "bg-tang";
            return (
              <Panel
                key={d.id}
                tone={d.tone}
                className="flex flex-col p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={microCls(gelap)}>Mitra</p>
                    <h3
                      className={`font-display text-lg leading-tight ${gelap ? "text-white" : ""}`}
                    >
                      {d.nama}
                    </h3>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm">
                    <IconBuilding size={16} />
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="ink">{d.bidang}</Badge>
                  <Badge tone="white">{d.kota}</Badge>
                  {d.akun ? (
                    <Badge tone="green">Akun login</Badge>
                  ) : (
                    <Badge tone="gray">Belum ada akun</Badge>
                  )}
                </div>

                <p
                  className={`mt-3 text-sm font-semibold ${gelap ? "text-white" : ""}`}
                >
                  {d.alamat}
                </p>

                <p className={`mt-2 flex items-center gap-1.5 ${microCls(gelap)}`}>
                  <IconPin size={14} /> Koordinat {d.koordinat || "belum diatur"}
                </p>

                <div
                  className={`mt-3 flex items-center gap-2.5 border-t-2 border pt-3 ${gelap ? "border-white/40" : "border-ink/30"}`}
                >
                  <Avatar name={d.pembimbing} size="sm" />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-bold ${gelap ? "text-white" : ""}`}
                    >
                      {d.pembimbing}
                    </p>
                    <p
                      className={`truncate text-[11px] font-semibold ${gelap ? "text-white" : "text-ink/70"}`}
                    >
                      Pembimbing DUDI · {d.kontak}
                    </p>
                  </div>
                </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-brutal bg-white p-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-ink/70">
                    <IconClock size={12} /> Jam Praktik
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{d.jam}</p>
                </div>
                <div className="rounded-brutal bg-white p-2.5">
                  <p className="text-[11px] font-bold tracking-wide text-ink/70">
                    Jumlah Siswa
                  </p>
                  <p className="font-display mt-0.5 text-xl leading-none">
                    {d.jmlSiswa}
                  </p>
                </div>
              </div>

              <div
                className={`mt-4 grid gap-2 border-t-2 border pt-3 ${gelap ? "border-white/40" : "border-ink/30"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {d.maps ? (
                    <Btn
                      size="sm"
                      tone="ink"
                      href={d.maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Lihat ${d.nama} di Google Maps`}
                    >
                      <IconPin size={14} /> Lihat di Peta
                    </Btn>
                  ) : (
                    <Btn
                      size="sm"
                      tone="white"
                      disabled
                      aria-label={`Peta ${d.nama} belum diatur`}
                    >
                      <IconPin size={14} /> Peta belum diatur
                    </Btn>
                  )}
                  <Badge tone="ink">
                    <IconUsers size={12} /> {d.jmlSiswa} siswa bimbingan
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Btn size="sm" tone="yellow" onClick={() => setEdit(d)}>
                    <IconEdit size={14} /> Ubah
                  </Btn>
                  <Btn
                    size="sm"
                    tone="white"
                    onClick={() => setHapus(d)}
                    disabled={d.jmlSiswa > 0}
                    title={
                      d.jmlSiswa > 0
                        ? "Pindahkan siswa dulu sebelum menghapus mitra ini."
                        : "Hapus mitra"
                    }
                  >
                    <IconX size={14} /> Hapus
                  </Btn>
                </div>
              </div>
              </Panel>
            );
          })}
        </div>
      )}

      {}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Mitra">
        <FormMitra
          awal={FORM_KOSONG}
          labelSimpan="Simpan Mitra"
          pending={pending}
          onSimpan={tambahMitra}
          onBatal={() => setOpenAdd(false)}
        />
      </Modal>

      {}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Ubah Mitra">
        {edit ? (
          <FormMitra
            key={edit.id}
            awal={{
              nama: edit.nama,
              bidang: edit.bidang,
              alamat: edit.alamat,
              kota: edit.kota,
              pembimbing: edit.pembimbing,
              kontak: edit.kontak,
              jam: edit.jam,
              radiusM: String(edit.radiusM ?? 100),
              mapsUrl: edit.mapsUrl,
              email: edit.akun?.email ?? "",
              sandi: "",
            }}
            akun={edit.akun}
            onPutusGoogle={putusGoogle}
            awalLokasi={
              edit.lat != null && edit.lng != null
                ? { lat: edit.lat, lng: edit.lng, label: edit.koordinat }
                : null
            }
            labelSimpan="Simpan Perubahan"
            pending={pending}
            onSimpan={simpanMitra}
            onBatal={() => setEdit(null)}
          />
        ) : null}
      </Modal>

      {}
      <Modal open={!!hapus} onClose={() => setHapus(null)} title="Hapus Mitra">
        {hapus ? (
          <div className="grid gap-4">
            <p className="text-sm font-semibold">
              Hapus mitra <b>{hapus.nama}</b>?{" "}
              {hapus.jmlSiswa > 0
                ? `${hapus.jmlSiswa} siswa masih PKL di sini. Pindahkan mereka dulu.`
                : "Tindakan ini tidak bisa dibatalkan."}
            </p>
            {hapus.jmlAkun > 0 ? (
              <p className="rounded-brutal border bg-cherry/30 px-3 py-2 text-xs font-bold">
                {hapus.jmlAkun} akun pembimbing DUDI terhubung ikut dihapus dan
                tidak bisa masuk lagi.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn
                tone="red"
                onClick={hapusMitra}
                disabled={busy || hapus.jmlSiswa > 0}
              >
                {busy ? "Menghapus…" : "Ya, hapus mitra"}
              </Btn>
              <Btn tone="white" onClick={() => setHapus(null)} disabled={busy}>
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
