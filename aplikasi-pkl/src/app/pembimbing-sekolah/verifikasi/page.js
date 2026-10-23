"use client";

import { useEffect, useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  PageHeader,
  StatusBadge,
  Avatar,
  EmptyState,
  Modal,
  Field,
  Input,
  Textarea,
  Toast,
  VerifySteps,
  Progress,
  SectionTitle,
  LoadingBlock,
} from "@/components/ui";
import { IconCheck, IconCheckDouble, IconX, IconClock, IconFile, IconEdit, IconBuilding } from "@/components/icons";
import { VerifikasiTimeline } from "@/components/timeline";
import { JurnalDetail } from "@/components/detail-tinjauan";
import { useApi, api } from "@/lib/api";
import { formatTanggal, formatWaktu, cariDudi, cariSiswa } from "@/lib/calc";

const MICRO = "text-[11px] font-medium text-ink/65";

function pilihAwal(list) {
  return list.find((j) => j.status === "menunggu_sekolah")?.id ?? list[0]?.id ?? null;
}

function Gagal({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/40 p-5"
    >
      <p className={MICRO}>Gagal memuat data</p>
      <p className="mt-1 text-sm font-bold">{error?.message ?? "Permintaan gagal."}</p>
      <Btn tone="white" size="sm" className="mt-3" onClick={onRetry}>
        Coba lagi
      </Btn>
    </div>
  );
}

function RiwayatRow({ j, e, onTinjau }) {
  const sah = e.keputusan === "diterima";
  return (
    <div className="rounded-brutal bg-white/70 p-3 shadow-brutal-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={MICRO}>
          {formatWaktu(j.verifikasiSekolahAt ?? j.tanggal, true)}
        </span>
        <Badge tone={sah ? "green" : "red"}>
          {sah ? <IconCheck size={12} /> : <IconX size={12} />}
          {sah ? "Diterima" : "Ditolak"}
        </Badge>
      </div>
      <p className="font-display text-sm leading-tight">{j.judul}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-ink/70">
        {j.siswaNama ?? "-"} · {j.siswaKelas ?? "-"}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-ink/65">
        <IconCheckDouble size={13} />{" "}
        {j.verifikasiSekolahOleh
          ? `${j.verifikasiSekolahOleh} · ${sah ? "mengesahkan" : "mengembalikan"}`
          : e.oleh}
      </p>
      {e.catatan ? (
        <p className="mt-1.5 text-xs font-medium text-ink/75">Catatan: “{e.catatan}”</p>
      ) : null}
      {onTinjau ? (
        <Btn tone="white" size="sm" className="mt-2" onClick={() => onTinjau(j.id)}>
          Tinjau lagi
        </Btn>
      ) : null}
    </div>
  );
}

export default function VerifikasiAkhirSekolahPage() {
  const queueQuery = useApi("/api/jurnal?status=menunggu_sekolah&limit=300");
  const riwayatQuery = useApi("/api/jurnal?status=diterima,ditolak&limit=100");
  const siswaQuery = useApi("/api/siswa");
  const dudiQuery = useApi("/api/dudi");

  const [selectedId, setSelectedId] = useState(null);
  const [tinjauId, setTinjauId] = useState(null);
  const [cari, setCari] = useState("");
  const [modal, setModal] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [toast, setToast] = useState(null);
  const [log, setLog] = useState([]);
  const [pending, setPending] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const antrean = queueQuery.data?.jurnal ?? [];
  const siswaList = siswaQuery.data?.siswa ?? [];
  const dudiList = dudiQuery.data?.dudi ?? [];

  const loggedIds = new Set(log.map((e) => e.id));
  const antre = antrean.filter((j) => !loggedIds.has(j.id));
  const q = cari.trim().toLowerCase();
  const cocokCari = (j) =>
    !q ||
    [j.siswaNama, j.siswaKelas, j.judul, j.tanggal].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  const tampil = antre.filter(cocokCari);
  const adaPilihan = selectedId != null && antre.some((j) => j.id === selectedId);
  const pilihanId = adaPilihan ? selectedId : pilihAwal(antre);
  const selected = antre.find((j) => j.id === pilihanId) ?? null;
  const siswaTerpilih = selected ? cariSiswa(siswaList, selected.siswaId) : null;
  const dudiTerpilih = selected ? cariDudi(dudiList, selected.dudiId) : null;
  const selesai = log.length;
  const total = antre.length + selesai;
  const bisaPutus = !!selected && selected.status === "menunggu_sekolah";

  const arsipAwal = (riwayatQuery.data?.jurnal ?? []).filter(
    (j) => !loggedIds.has(j.id)
  );

  const riwayat = [
    ...log
      .filter((e) => e.jurnal)
      .map((e) => ({ j: e.jurnal, e })),
    ...arsipAwal.map((j) => ({
      j,
      e: {
        keputusan: j.status,
        oleh:
          j.status === "diterima"
            ? "Disahkan Pembimbing Sekolah"
            : "Dikembalikan ke siswa",
        catatan: j.catatanSekolah || j.catatanDudi || "",
      },
    })),
  ];

  const memuat =
    (queueQuery.loading && !queueQuery.data) ||
    (riwayatQuery.loading && !riwayatQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data) ||
    (dudiQuery.loading && !dudiQuery.data);
  const galat =
    queueQuery.error || riwayatQuery.error || siswaQuery.error || dudiQuery.error;

  function cobaLagi() {
    queueQuery.reload();
    riwayatQuery.reload();
    siswaQuery.reload();
    dudiQuery.reload();
  }

  function flash(text, Ikon) {
    setToast({ text, Ikon });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  function pilihBerikutnya(dariId) {
    const idx = antre.findIndex((j) => j.id === dariId);
    const urut =
      idx < 0
        ? antre.filter((j) => j.id !== dariId)
        : [...antre.slice(idx + 1), ...antre.slice(0, idx)];
    return urut.find((j) => j.id !== dariId)?.id ?? null;
  }

  async function putuskan(item, keputusan, nilai = "") {
    if (!item || pending || loggedIds.has(item.id)) return false;
    const berikutnya = pilihBerikutnya(item.id);
    setPending(true);
    try {
      const res = await api(`/api/jurnal/${item.id}/verify`, {
        method: "POST",
        body: {
          aksi: keputusan === "diterima" ? "terima" : "tolak",
          ...(nilai ? { catatan: nilai } : {}),
        },
      });
      setLog((prev) => [
        {
          id: item.id,
          jurnal: res.jurnal,
          keputusan,
          oleh:
            keputusan === "diterima"
              ? "Disahkan Pembimbing Sekolah"
              : "Dikembalikan Pembimbing Sekolah",
          catatan: nilai,
        },
        ...prev,
      ]);
      setSelectedId(berikutnya);
      queueQuery.reload();
      riwayatQuery.reload();
      return true;
    } catch (err) {
      flash(err.message, IconX);
      if (err.status) {
        queueQuery.reload();
        riwayatQuery.reload();
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  function bukaKeputusan(mode, item) {
    if (!item || item.status !== "menunggu_sekolah" || pending) return;
    setSelectedId(item.id);
    setCatatan("");
    setModal(mode);
  }

  const bukaSahkan = (item) => bukaKeputusan("sahkan", item);
  const bukaKembalikan = (item) => bukaKeputusan("kembalikan", item);

  function tutupModal() {
    setModal(null);
    setCatatan("");
  }

  async function kirimSahkan() {
    if (!bisaPutus || pending) return;
    const ok = await putuskan(selected, "diterima", catatan.trim());
    if (ok) {
      tutupModal();
      flash("Jurnal disahkan dan diterima sebagai arsip final", IconCheck);
    }
  }

  async function kirimKembalikan() {
    const nilai = catatan.trim();
    if (!nilai || !bisaPutus || pending) return;
    const ok = await putuskan(selected, "ditolak", nilai);
    if (ok) {
      tutupModal();
      flash("Jurnal dikembalikan ke siswa untuk diperbaiki", IconX);
    }
  }

  if (memuat) return <LoadingBlock label="Memuat antrean pengesahan…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;

  return (
    <div>
      <PageHeader
        title="Verifikasi Akhir Jurnal"
        desc="Tahap akhir: jurnal yang sudah lolos DUDI."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              tone="purple"
              onClick={() => bukaSahkan(selected)}
              disabled={!bisaPutus || pending}
            >
              <IconCheck size={16} /> Sahkan Terpilih
            </Btn>
            <Btn href="/pembimbing-sekolah" tone="white">
              Dasbor
            </Btn>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {}
        <div>
          <Panel className="p-4 sm:p-5">
            <p className={MICRO}>Proses sesi ini</p>
            <p className="font-display mt-1 text-lg">
              {selesai} dari {total} selesai
            </p>
            <Progress
              className="mt-2.5"
              value={total ? (selesai / total) * 100 : 0}
              tone="bg-grape"
            />
          </Panel>

          <div className="mt-4">
            <Field label="Cari jurnal" hint="Nama siswa, kelas, atau judul.">
              <Input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="cth. Alya / kasir"
              />
            </Field>
          </div>

          <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {tampil.length === 0 ? (
              <EmptyState
                title="Antrean kosong"
                desc={
                  q
                    ? "Tidak ada jurnal yang cocok dengan pencarian."
                    : "Tidak ada jurnal menunggu pengesahanmu."
                }
              />
            ) : (
              tampil.map((j) => {
                const active = j.id === pilihanId;
                return (
                  <div
                    key={j.id}
                    className={`group rounded-brutal transition-all ${
                      active
                        ? "translate-x-[3px] translate-y-[3px] bg-ink text-white shadow-none"
                        : "bg-white shadow-brutal-sm hover:bg-sun"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(j.id)}
                      className="block w-full p-3 text-left"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold ${
                            active ? "text-white" : "text-ink/65"
                          }`}
                        >
                          {formatTanggal(j.tanggal)}
                        </span>
                        <StatusBadge status={j.status} />
                      </div>
                      <p className="font-display text-sm leading-tight">{j.judul}</p>
                      <p
                        className={`mt-0.5 truncate text-xs font-semibold ${
                          active ? "text-white" : "text-ink/70"
                        }`}
                      >
                        {j.siswaNama} · {j.siswaKelas}
                      </p>
                    </button>

                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                      <Btn size="sm" tone="green" onClick={() => bukaSahkan(j)} disabled={pending}>
                        <IconCheck size={13} /> Sahkan
                      </Btn>
                      <Btn size="sm" tone="red" onClick={() => bukaKembalikan(j)} disabled={pending}>
                        <IconX size={13} /> Kembalikan
                      </Btn>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className={`mt-3 ${MICRO} text-ink/65`}>
            {}
            {queueQuery.data?.total ?? antre.length} menunggu pengesahanmu
          </p>

          {}
          <div className="mt-6">
            <SectionTitle
              right={
                <span className="text-xs font-bold text-ink/65">
                  {riwayat.length} dokumen
                </span>
              }
            >
              Riwayat
            </SectionTitle>
            {riwayat.length === 0 ? (
              <EmptyState
                title="Belum ada arsip"
                desc="Jurnal yang kamu sahkan sesi ini tampil di sini."
              />
            ) : (
              <div className="grid gap-2">
                {riwayat
                  .filter(({ j }) => cocokCari(j))
                  .map(({ j, e }) => (
                    <RiwayatRow
                      key={j.id}
                      j={j}
                      e={e}
                      onTinjau={(id) => setTinjauId(id)}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        {}
        {selected ? (
          <Panel className="self-start overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-grape px-4 py-3">
              <h2 className="font-display text-lg">Detail Jurnal</h2>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid gap-4 p-4 sm:p-5">
              {}
              <div className="flex items-center gap-3">
                <Avatar name={selected.siswaNama ?? "?"} size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-lg leading-tight">
                    {selected.siswaNama}
                  </p>
                  <p className="text-xs font-bold text-ink/70">
                    {selected.siswaKelas} · NIS{" "}
                    {siswaTerpilih?.nis ?? "-"}
                  </p>
                  <p className="text-xs font-semibold text-ink/65">
                    {dudiTerpilih?.nama} · {dudiTerpilih?.bidang}
                  </p>
                </div>
              </div>

              {}
              {selected.catatanDudi ||
              ["menunggu_sekolah", "diterima"].includes(selected.status) ? (
                <Badge tone="blue">
                  <IconCheck size={12} /> Tahap 2 dari 2: sudah diverifikasi DUDI
                </Badge>
              ) : null}

              {}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-brutal bg-paper p-3">
                  <p className={MICRO}>Tanggal</p>
                  <p className="mt-0.5 text-sm font-bold">
                    {formatTanggal(selected.tanggal, true)}
                  </p>
                </div>
                <div className="rounded-brutal bg-paper p-3">
                  <p className={MICRO}>Jam Masuk</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold">
                    <IconClock size={14} /> {selected.masuk}
                  </p>
                </div>
                <div className="rounded-brutal bg-paper p-3">
                  <p className={MICRO}>Jam Keluar</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold">
                    <IconClock size={14} /> {selected.keluar}
                  </p>
                </div>
              </div>

              {}
              <div className="rounded-brutal bg-sun/40 p-3">
                <p className={MICRO}>Judul kegiatan</p>
                <p className="font-display text-lg leading-tight">{selected.judul}</p>
              </div>

              <div>
                <p className={MICRO}>Uraian kegiatan</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink/80">
                  {selected.kegiatan}
                </p>
              </div>

              {}
              <div className="flex flex-wrap items-center gap-2">
                {selected.berkas?.length ? (
                  <ul className="grid gap-1.5">
                    {selected.berkas.map((b) => (
                      <li key={b.id}>
                        <a
                          href={b.url}
                          className="inline-flex items-center gap-1.5 rounded-brutal bg-paper px-2.5 py-1 text-xs font-normal underline decoration-1 underline-offset-2 hover:text-marine"
                        >
                          <IconFile size={13} /> {b.nama}
                          <span className="text-ink/60">{b.ukuranTeks}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Badge tone="white">
                    <IconFile size={12} /> {selected.lampiran || "Tanpa lampiran"}
                  </Badge>
                )}
              </div>

              {}
              {selected.catatanDudi || selected.catatanSekolah ? (
                <div className="grid gap-2">
                  {selected.catatanDudi ? (
                    <p className="flex items-start gap-2 rounded-brutal bg-paper p-2.5 text-xs font-semibold">
                      <span className="mt-px shrink-0">
                        <IconEdit size={14} />
                      </span>
                      <span>Catatan DUDI: “{selected.catatanDudi}”</span>
                    </p>
                  ) : null}
                  {selected.catatanSekolah ? (
                    <p className="rounded-brutal bg-grape/30 p-2.5 text-xs font-semibold">
                      <span className="mt-px shrink-0">
                        <IconBuilding size={14} />
                      </span>
                      <span>Catatan sekolah: “{selected.catatanSekolah}”</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {}
              <div className="border-t-2 pt-3">
                <VerifySteps status={selected.status} />
              </div>

              {}
              <div className="border-t-2 pt-3">
                <p className={`mb-2 ${MICRO}`}>Riwayat Verifikasi</p>
                <VerifikasiTimeline jurnal={selected} />
              </div>

              {}
              <div className="rounded-brutal bg-paper p-3">
                <p className={MICRO}>Pengesahan akhir</p>
                {bisaPutus ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Btn tone="green" onClick={() => bukaSahkan(selected)} disabled={pending}>
                      <IconCheck size={16} /> Sahkan
                    </Btn>
                    <Btn tone="red" onClick={() => bukaKembalikan(selected)} disabled={pending}>
                      <IconX size={16} /> Kembalikan
                    </Btn>
                    <span className="text-xs font-bold text-ink/65">
                      Tahap 2 dari 2
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-ink/75">
                    {selected.status === "diterima"
                      ? "Jurnal sudah disahkan. Arsip final tersimpan."
                      : selected.status === "ditolak"
                        ? "Jurnal dikembalikan ke siswa untuk diperbaiki."
                        : "Menunggu verifikasi dari pembimbing DUDI terlebih dahulu."}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        ) : (
          <div className="self-start">
            <EmptyState
              title={
                <span className="flex items-center justify-center gap-2">
                  <IconCheckDouble size={22} /> Semua jurnal sudah diproses
                </span>
              }
              desc={`${selesai} jurnal kamu sahkan sesi ini. Tidak ada antrean baru.`}
              action={
                <Btn href="/pembimbing-sekolah" tone="white">
                  Kembali ke Dasbor
                </Btn>
              }
            />
          </div>
        )}
      </div>

      {}
      <Modal
        open={modal !== null}
        onClose={tutupModal}
        title={modal === "sahkan" ? "Sahkan Jurnal" : "Kembalikan Jurnal"}
        footer={
          <>
            <Btn tone="white" onClick={tutupModal}>
              Batal
            </Btn>
            {modal === "sahkan" ? (
              <Btn tone="green" onClick={kirimSahkan} disabled={pending}>
                <IconCheck size={16} /> Sahkan
              </Btn>
            ) : (
              <Btn tone="red" onClick={kirimKembalikan} disabled={!catatan.trim() || pending}>
                <IconX size={16} /> Kirim Catatan
              </Btn>
            )}
          </>
        }
      >
        {selected ? (
          <>
            <p className="mb-3 rounded-brutal bg-paper p-2.5 text-xs font-semibold">
              {selected.judul}, {selected.siswaNama} ·{" "}
              {formatTanggal(selected.tanggal, true)}
            </p>
            <Field
              label={modal === "sahkan" ? "Pesan untuk siswa" : "Pesan koreksi"}
              hint={
                modal === "sahkan"
                  ? "Opsional: apresiasi atau arahan lanjutan, ikut tersimpan di riwayat."
                  : "Wajib diisi: alasan dikirim ke siswa untuk diperbaiki."
              }
            >
              <Textarea
                rows={4}
                data-autofocus
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder={
                  modal === "sahkan"
                    ? "cth. Sudah sesuai, arsip final tersimpan."
                    : "cth. Uraian kegiatan masih terlalu singkat, jelaskan hasilnya."
                }
              />
            </Field>
            {modal !== "sahkan" && !catatan.trim() ? (
              <p className="mt-2 text-[11px] font-bold tracking-wide text-ink/70">
                Pesan koreksi wajib diisi sebelum mengirim.
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>

      <JurnalDetail id={tinjauId} onClose={() => setTinjauId(null)} />

      <Toast show={!!toast}>
        {toast ? (
          <span className="flex items-center gap-2">
            <toast.Ikon size={16} />
            {toast.text}
          </span>
        ) : null}
      </Toast>
    </div>
  );
}
