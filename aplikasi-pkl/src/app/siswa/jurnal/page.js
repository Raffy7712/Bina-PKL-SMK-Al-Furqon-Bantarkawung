"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Chip,
  Field,
  Input,
  Textarea,
  Modal,
  PageHeader,
  StatusBadge,
  VerifySteps,
  EmptyState,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import {
  IconPlus,
  IconUpload,
  IconFile,
  IconX,
  IconClock,
  IconBuilding,
  IconShield,
} from "@/components/icons";
import { useApi, api } from "@/lib/api";
import { UnggahBerkas } from "@/components/unggah-berkas";
import { formatTanggal, FILTER_STATUS } from "@/lib/calc";
import { useHariIni, isoHariIni, NAMA_BULAN } from "@/lib/tanggal";

const MICRO = "text-[11px] font-medium text-ink/65";

const EMPTY_FORM = {
  tanggal: "",
  judul: "",
  uraian: "",
  masuk: "07:55",
  keluar: "16:30",
};

const formHariIni = () => ({ ...EMPTY_FORM, tanggal: isoHariIni() });

function GagalMemuat({ pesan, onCoba }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/30 p-4 sm:p-5"
    >
      <p className="font-display text-base leading-tight">Data gagal dimuat</p>
      <p className="mt-1 text-sm font-semibold text-ink/75">{pesan}</p>
      <div className="mt-3">
        <Btn tone="ink" size="sm" onClick={onCoba}>
          Coba lagi
        </Btn>
      </div>
    </div>
  );
}

export default function JurnalPage() {
  const hariIni = useHariIni();
  const bulanIni = hariIni ? hariIni.slice(0, 7) : null;
  const { data, loading, error, reload } = useApi(
    bulanIni ? `/api/jurnal?bulan=${bulanIni}` : null
  );
  const semua = data?.jurnal ?? [];
  const [tahunIni, bulanAngka] = bulanIni ? bulanIni.split("-").map(Number) : [0, 0];
  const labelBulan = bulanIni ? `${NAMA_BULAN[bulanAngka - 1]} ${tahunIni}` : "";

  const [filter, setFilter] = useState("semua");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [berkas, setBerkas] = useState([]);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const list =
    filter === "semua" ? semua : semua.filter((j) => j.status === filter);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function bukaModal() {
    setForm(formHariIni());
    setBerkas([]);
    setOpen(true);
  }

  async function simpanJurnal(e) {
    e.preventDefault();
    if (!form.judul.trim() || pending) return;
    setPending(true);
    try {
      await api("/api/jurnal", {
        method: "POST",
        body: {
          judul: form.judul.trim(),
          tanggal: form.tanggal,
          masuk: form.masuk,
          keluar: form.keluar,
          kegiatan: form.uraian.trim() || "-",
          berkasIds: berkas.map((b) => b.id),
        },
      });
      setForm(formHariIni());
      setBerkas([]);
      setOpen(false);
      showToast("Jurnal tersimpan dan dikirim ke pembimbing DUDI");
      reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Jurnal Harian"
        desc={
          labelBulan
            ? `Jurnal ${labelBulan}. Diverifikasi DUDI, lalu sekolah.`
            : "Catatan harian praktikmu, diverifikasi DUDI lalu sekolah."
        }
        action={
          <Btn tone="ink" onClick={bukaModal}>
            <IconPlus size={16} /> Tambah Jurnal
          </Btn>
        }
      />

      {}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_STATUS.map((f) => {
          const jumlah =
            f.key === "semua"
              ? semua.length
              : semua.filter((j) => j.status === f.key).length;
          return (
            <Chip
              key={f.key}
              active={filter === f.key}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}{" "}
              <span className="opacity-60">({jumlah})</span>
            </Chip>
          );
        })}
      </div>

      {}
      {!bulanIni || loading ? (
        <div className="mt-5">
          <LoadingBlock label="Memuat jurnal…" />
        </div>
      ) : error ? (
        <div className="mt-5">
          <GagalMemuat pesan={error.message} onCoba={reload} />
        </div>
      ) : list.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Belum ada jurnal di filter ini"
            desc="Ubah filter, atau tulis jurnal hari ini."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filter !== "semua" ? (
                  <Btn tone="white" onClick={() => setFilter("semua")}>
                    Tampilkan Semua
                  </Btn>
                ) : null}
                <Btn tone="ink" onClick={bukaModal}>
                  <IconPlus size={16} /> Tambah Jurnal
                </Btn>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {list.map((j) => (
            <Panel
              key={j.id}
              className="p-4 sm:p-5"
              tone={j.status === "ditolak" ? "bg-cherry/30" : "bg-white"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full bg-paper px-2 py-0.5 ${MICRO}`}>
                      {formatTanggal(j.tanggal, true)}
                    </span>
                    <span className={`flex items-center gap-1.5 ${MICRO}`}>
                      <IconClock size={13} /> {j.masuk} – {j.keluar}
                    </span>
                  </div>
                  <h3 className="font-display text-base leading-tight">
                    {j.judul}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-ink/70">
                    {j.kegiatan}
                  </p>
                </div>
                <StatusBadge status={j.status} />
              </div>

              {j.berkas?.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {j.berkas.map((b) => (
                    <li key={b.id}>
                      <a
                        href={b.url}
                        className="inline-flex items-center gap-1.5 rounded-brutal bg-sun px-2.5 py-1 text-[11px] font-semibold hover:bg-sun/70"
                      >
                        <IconFile size={13} /> {b.nama}
                        <span className="text-ink/60">{b.ukuranTeks}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : j.lampiran ? (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-brutal bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink/70">
                  <IconFile size={13} /> {j.lampiran} (berkas lama)
                </span>
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-brutal bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink/70">
                  Tanpa lampiran
                </span>
              )}

              {j.catatanDudi || j.catatanSekolah ? (
                <div className="mt-3 grid gap-2">
                  {j.catatanDudi ? (
                    <p className="flex items-start gap-2 rounded-brutal bg-tang/40 p-2.5 text-xs font-semibold">
                      <IconBuilding size={14} className="mt-0.5 shrink-0" />
                      <span>DUDI: “{j.catatanDudi}”</span>
                    </p>
                  ) : null}
                  {j.catatanSekolah ? (
                    <p className="flex items-start gap-2 rounded-brutal bg-grape/40 p-2.5 text-xs font-semibold">
                      <IconShield size={14} className="mt-0.5 shrink-0" />
                      <span>Sekolah: “{j.catatanSekolah}”</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 border-t-2 pt-3">
                <VerifySteps status={j.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}

      {}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Jurnal Harian"
        footer={
          <>
            <Btn tone="white" onClick={() => setOpen(false)}>
              Batal
            </Btn>
            <Btn tone="ink" type="submit" form="form-jurnal" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Jurnal"}
            </Btn>
          </>
        }
      >
        <form id="form-jurnal" onSubmit={simpanJurnal} className="grid gap-4">
          <Field label="Tanggal">
            <Input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
          </Field>

          <Field label="Judul Kegiatan">
            <Input
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="cth. Membuat halaman laporan"
              required
              data-autofocus
            />
          </Field>

          <Field
            label="Uraian Kegiatan"
            hint="Cakup pekerjaan, kendala, dan hasil yang dicapai."
          >
            <Textarea
              rows={4}
              value={form.uraian}
              onChange={(e) => setForm({ ...form, uraian: e.target.value })}
              placeholder="Tulis apa saja yang kamu kerjakan hari ini…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jam Masuk">
              <Input
                type="time"
                value={form.masuk}
                onChange={(e) => setForm({ ...form, masuk: e.target.value })}
              />
            </Field>
            <Field label="Jam Keluar">
              <Input
                type="time"
                value={form.keluar}
                onChange={(e) => setForm({ ...form, keluar: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <UnggahBerkas
              berkas={berkas}
              onChange={setBerkas}
              onError={showToast}
              label="Lampiran bukti (opsional)"
              hint="Gambar, PDF, DOCX, XLSX, atau PPT, maksimal 10 MB per berkas."
            />
          </div>

          <p className="flex items-start gap-2 rounded-brutal bg-marine/40 p-2.5 text-xs font-semibold">
            <IconClock size={14} className="mt-0.5 shrink-0" />
            <span>
              Status awal jurnal baru: <b>Menunggu DUDI</b>.
            </span>
          </p>
        </form>
      </Modal>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
