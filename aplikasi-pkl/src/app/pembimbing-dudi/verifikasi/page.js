"use client";

import { useEffect, useRef, useState } from "react";
import {
  Panel,
  Btn,
  Chip,
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
import { IconCheck, IconCheckDouble, IconX, IconClock, IconFile, IconEdit } from "@/components/icons";
import { VerifikasiTimeline } from "@/components/timeline";
import { JurnalDetail } from "@/components/detail-tinjauan";
import { useApi, api } from "@/lib/api";
import { formatTanggal, formatWaktu, cariDudi, cariSiswa } from "@/lib/calc";

const MICRO = "text-[11px] font-medium text-ink/65";

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "menunggu_dudi", label: "Menunggu Saya" },
  { key: "menunggu_sekolah", label: "Menunggu Sekolah" },
];

const isAntre = (j) => j.status === "menunggu_dudi" || j.status === "menunggu_sekolah";

function pilihAwal(list) {
  return list.find((j) => j.status === "menunggu_dudi")?.id ?? list[0]?.id ?? null;
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
  const diterima = e.keputusan === "diterima";
  return (
    <div className="rounded-brutal bg-white/70 p-3 shadow-brutal-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={MICRO}>
          {formatWaktu(j.verifikasiDudiAt ?? j.tanggal, true)}
        </span>
        <Badge tone={diterima ? "green" : "red"}>
          {diterima ? <IconCheck size={12} /> : <IconX size={12} />}
          {diterima ? "Diterima" : "Ditolak"}
        </Badge>
      </div>
      <p className="font-display text-sm leading-tight">{j.judul}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-ink/70">
        {j.siswaNama ?? "-"} · {j.siswaKelas ?? "-"}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-ink/65">
        <IconCheckDouble size={13} />{" "}
        {j.verifikasiDudiOleh
          ? `${j.verifikasiDudiOleh} · ${diterima ? "menyetujui" : "menolak"}`
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

export default function VerifikasiJurnalDudiPage() {
  const queueQuery = useApi(
    "/api/jurnal?status=menunggu_dudi,menunggu_sekolah&limit=300"
  );
  const riwayatQuery = useApi("/api/jurnal?status=diterima,ditolak&limit=100");
  const siswaQuery = useApi("/api/siswa");
  const dudiQuery = useApi("/api/dudi");

  const [selectedId, setSelectedId] = useState(null);
  const [tinjauId, setTinjauId] = useState(null);
  const [filter, setFilter] = useState("semua");
  const [cari, setCari] = useState("");
  const [modal, setModal] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [toast, setToast] = useState(null);
  const [log, setLog] = useState([]);
  const [pending, setPending] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const items = queueQuery.data?.jurnal ?? [];
  const arsip = riwayatQuery.data?.jurnal ?? [];
  const siswaList = siswaQuery.data?.siswa ?? [];
  const dudiList = dudiQuery.data?.dudi ?? [];

  const loggedIds = new Set(log.map((e) => e.id));
  const antre = items.filter((j) => isAntre(j) && !loggedIds.has(j.id));
  const q = cari.trim().toLowerCase();
  const cocokCari = (j) =>
    !q ||
    [j.siswaNama, j.siswaKelas, j.judul, j.tanggal].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  const filtered = antre.filter(
    (j) => (filter === "semua" || j.status === filter) && cocokCari(j)
  );
  const adaPilihan = selectedId != null && antre.some((j) => j.id === selectedId);
  const pilihanId = adaPilihan ? selectedId : pilihAwal(antre);
  const selected = antre.find((j) => j.id === pilihanId) ?? null;
  const siswaTerpilih = selected ? cariSiswa(siswaList, selected.siswaId) : null;
  const dudiTerpilih = selected ? cariDudi(dudiList, selected.dudiId) : null;
  const jmlMenungguSaya = antre.filter((j) => j.status === "menunggu_dudi").length;
  const selesai = log.length;
  const total = jmlMenungguSaya + selesai;
  const bisaPutus = !!selected && selected.status === "menunggu_dudi";

  const riwayat = log
    .map((e) => ({ j: e.jurnal ?? arsip.find((x) => x.id === e.id), e }))
    .filter((r) => r.j);

  const memuat =
    (queueQuery.loading && !queueQuery.data) ||
    (riwayatQuery.loading && !riwayatQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data) ||
    (dudiQuery.loading && !dudiQuery.data);
  const galat =
    queueQuery.error ||
    riwayatQuery.error ||
    siswaQuery.error ||
    dudiQuery.error;

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
    const sisa = urut.filter((j) => j.id !== dariId);
    return (
      sisa.find((j) => j.status === "menunggu_dudi")?.id ?? sisa[0]?.id ?? null
    );
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
          jurnal: res?.jurnal ?? null,
          keputusan,
          oleh:
            keputusan === "diterima"
              ? "Disetujui Pembimbing DUDI"
              : "Ditolak Pembimbing DUDI",
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
    if (!item || item.status !== "menunggu_dudi" || pending) return;
    setSelectedId(item.id);
    setCatatan("");
    setModal(mode);
  }

  const bukaTerima = (item) => bukaKeputusan("terima", item);
  const bukaTolak = (item) => bukaKeputusan("tolak", item);

  function tutupModal() {
    setModal(null);
    setCatatan("");
  }

  async function kirimTerima() {
    if (!bisaPutus || pending) return;
    const ok = await putuskan(selected, "diterima", catatan.trim());
    if (ok) {
      tutupModal();
      flash("Jurnal diterima, diteruskan ke pembimbing sekolah", IconCheck);
    }
  }

  async function kirimTolak() {
    const nilai = catatan.trim();
    if (!nilai || !bisaPutus || pending) return;
    const ok = await putuskan(selected, "ditolak", nilai);
    if (ok) {
      tutupModal();
      flash("Jurnal ditolak, dikembalikan ke siswa untuk diperbaiki", IconX);
    }
  }

  function gantiFilter(key) {
    setFilter(key);
    const list = antre.filter((j) => key === "semua" || j.status === key);
    if (list.length > 0 && !list.some((j) => j.id === selectedId)) {
      setSelectedId(pilihAwal(list) ?? list[0].id);
    }
  }

  if (memuat) return <LoadingBlock label="Memuat antrean verifikasi…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;

  return (
    <div>
      <PageHeader
        title="Verifikasi Jurnal"
        desc="Jurnal praktikan yang menunggu keputusanmu."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              tone="green"
              onClick={() => bukaTerima(selected)}
              disabled={!bisaPutus || pending}
            >
              <IconCheck size={16} /> Terima Terpilih
            </Btn>
            <Btn href="/pembimbing-dudi" tone="white">
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
              tone="bg-mint"
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

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                active={filter === f.key}
                onClick={() => gantiFilter(f.key)}
              >
                {f.label}
              </Chip>
            ))}
          </div>

          <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <EmptyState
                title="Antrean kosong"
                desc={
                  q
                    ? "Tidak ada jurnal yang cocok dengan pencarian."
                    : "Tidak ada jurnal pada filter ini. Lihat Riwayat di bawah."
                }
              />
            ) : (
              filtered.map((j) => {
                const active = j.id === pilihanId;
                const sah = j.status === "menunggu_dudi";
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

                    {sah ? (
                      <div className="flex flex-wrap gap-2 px-3 pb-3">
                        <Btn size="sm" tone="green" onClick={() => bukaTerima(j)} disabled={pending}>
                          <IconCheck size={13} /> Terima
                        </Btn>
                        <Btn size="sm" tone="red" onClick={() => bukaTolak(j)} disabled={pending}>
                          <IconX size={13} /> Tolak
                        </Btn>
                      </div>
                    ) : (
                      <p
                        className={`px-3 pb-3 text-[11px] font-bold tracking-wide ${
                          active ? "text-white" : "text-ink/65"
                        }`}
                      >
                        Menunggu pembimbing sekolah
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className={`mt-3 ${MICRO} text-ink/65`}>
            {jmlMenungguSaya} menunggu keputusanmu
          </p>

          {}
          <div className="mt-6">
            <SectionTitle
              right={
                <span className="text-xs font-bold text-ink/65">
                  {riwayat.length} diproses
                </span>
              }
            >
              Riwayat
            </SectionTitle>
            {riwayat.length === 0 ? (
              <EmptyState
                title="Belum ada yang diproses"
                desc="Jurnal yang kamu proses sesi ini tampil di sini."
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-marine px-4 py-3">
              <h2 className="font-display text-lg text-white">Detail Jurnal</h2>
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
                      Catatan sekolah: “{selected.catatanSekolah}”
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
                <p className={MICRO}>Keputusanmu</p>
                {bisaPutus ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Btn tone="green" onClick={() => bukaTerima(selected)} disabled={pending}>
                      <IconCheck size={16} /> Terima
                    </Btn>
                    <Btn tone="red" onClick={() => bukaTolak(selected)} disabled={pending}>
                      <IconX size={16} /> Tolak
                    </Btn>
                    <span className="text-xs font-bold text-ink/65">
                      Tahap 1 dari 2
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-ink/75">
                    {selected.status === "menunggu_sekolah"
                      ? "Sudah kamu verifikasi. Menunggu pengesahan sekolah."
                      : selected.status === "diterima"
                        ? "Jurnal sudah diverifikasi penuh oleh DUDI dan sekolah."
                        : "Jurnal ditolak dan dikembalikan ke siswa untuk diperbaiki."}
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
              desc={`${selesai} jurnal kamu proses sesi ini. Tidak ada antrean baru.`}
              action={
                <Btn href="/pembimbing-dudi" tone="white">
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
        title={modal === "terima" ? "Terima Jurnal" : "Tolak Jurnal"}
        footer={
          <>
            <Btn tone="white" onClick={tutupModal}>
              Batal
            </Btn>
            {modal === "terima" ? (
              <Btn tone="green" onClick={kirimTerima} disabled={pending}>
                <IconCheck size={16} /> Terima
              </Btn>
            ) : (
              <Btn tone="red" onClick={kirimTolak} disabled={!catatan.trim() || pending}>
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
              label={modal === "terima" ? "Pesan untuk siswa" : "Pesan koreksi"}
              hint={
                modal === "terima"
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
                  modal === "terima"
                    ? "cth. Jurnal rapi, pertahankan."
                    : "cth. Lampiran bukti belum ada, tolong dilengkapi."
                }
              />
            </Field>
            {modal !== "terima" && !catatan.trim() ? (
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
