"use client";

import { useEffect, useRef, useState } from "react";
import {
  Panel,
  Btn,
  Stat,
  PageHeader,
  SectionTitle,
  Avatar,
  Badge,
  LaporanBadge,
  Field,
  Input,
  Textarea,
  Toast,
  EmptyState,
  Modal,
  LoadingBlock,
} from "@/components/ui";
import { IconCheck, IconClock, IconEdit, IconFile, IconStar, IconX } from "@/components/icons";
import { RiwayatLaporan } from "@/components/timeline";
import { LaporanDetail } from "@/components/detail-tinjauan";
import { ASPEK_PENILAIAN } from "@/lib/nilai";
import { useApi, api } from "@/lib/api";
import { formatTanggal, cariSiswa } from "@/lib/calc";

const MICRO = "text-[11px] font-medium text-ink/65";

function formatNilai(v) {
  return Number(v).toFixed(1).replace(".", ",");
}

function formatAngka(v) {
  return String(v).replace(".", ",");
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

export default function ReviewLaporanPage() {
  const laporanQuery = useApi("/api/laporan");
  const siswaQuery = useApi("/api/siswa");

  const [hasil, setHasil] = useState({});
  const [catatan, setCatatan] = useState({});
  const [cari, setCari] = useState("");
  const [revisiId, setRevisiId] = useState(null);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  const [nilaiId, setNilaiId] = useState(null);
  const [rubrik, setRubrik] = useState({});
  const [nilaiError, setNilaiError] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [tinjauId, setTinjauId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [pending, setPending] = useState(false);
  const toastTimer = useRef(null);
  const detailReq = useRef(0);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const siswaList = siswaQuery.data?.siswa ?? [];
  const serverRows = laporanQuery.data?.laporan ?? [];

  const data = serverRows.map((l) => {
    const h = hasil[l.id];
    return h && h.dasar === serverRows ? h.baris : l;
  });

  function catatanDari(l) {
    return catatan[l.id] ?? l.feedback ?? "";
  }

  const q = cari.trim().toLowerCase();
  function cocokCari(l) {
    if (!q) return true;
    const s = identitas(l);
    return [l.judul, s.nama, s.kelas, l.feedback, l.jawaban].some((v) =>
      String(v ?? "").toLowerCase().includes(q)
    );
  }

  const review = data.filter(
    (l) => (l.status === "terkirim" || l.status === "revisi") && cocokCari(l)
  );
  const riwayat = data.filter(
    (l) => (l.status === "diterima" || l.status === "revisi") && cocokCari(l)
  );
  const laporanRevisi = data.find((l) => l.id === revisiId) ?? null;
  const laporanNilai = data.find((l) => l.id === nilaiId) ?? null;
  const laporanDetail = detailData?.laporan ?? data.find((l) => l.id === detailId) ?? null;
  const riwayatDetail = detailData?.riwayat ?? [];
  const detailIdentitas = laporanDetail ? identitas(laporanDetail) : null;

  const rubrikTerisi = ASPEK_PENILAIAN.filter(
    (a) => String(rubrik[a.kode] ?? "").trim() !== ""
  ).length;
  const rataRubrik =
    rubrikTerisi === ASPEK_PENILAIAN.length
      ? ASPEK_PENILAIAN.reduce(
          (s, a) => s + Number(rubrik[a.kode] || 0),
          0
        ) / ASPEK_PENILAIAN.length
      : null;

  function cobaLagi() {
    laporanQuery.reload();
    siswaQuery.reload();
  }

  function identitas(l) {
    const s = cariSiswa(siswaList, l.siswaId);
    return {
      nama: s?.nama ?? l.siswaNama ?? "-",
      kelas: s?.kelas ?? "-",
    };
  }

  function flash(text, Ikon) {
    setToast({ text, Ikon });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  async function terima(l, penilaian) {
    if (!l || pending) return false;
    const nilai = catatanDari(l).trim();
    setPending(true);
    try {
      const res = await api(`/api/laporan/${l.id}/review`, {
        method: "POST",
        body: {
          aksi: "terima",
          ...(nilai ? { catatan: nilai } : {}),
          ...(penilaian ? { penilaian } : {}),
        },
      });
      setHasil((prev) => ({
        ...prev,
        [l.id]: { baris: res.laporan, dasar: serverRows },
      }));
      laporanQuery.reload();
      return true;
    } catch (err) {
      flash(err.message, IconX);
      if (err.status) laporanQuery.reload();
      return false;
    } finally {
      setPending(false);
    }
  }

  function bukaTerima(l) {
    if (pending) return;
    setNilaiId(l.id);
    setRubrik({});
    setNilaiError("");
    setCatatan((c) => ({ ...c, [l.id]: "" }));
  }

  function tutupTerima() {
    setNilaiId(null);
    setRubrik({});
    setNilaiError("");
  }

  function ubahNilai(kode, nilai) {
    setRubrik((r) => ({ ...r, [kode]: nilai }));
    setNilaiError("");
  }

  async function konfirmasiTerima() {
    if (!laporanNilai || pending) return;
    if (rubrikTerisi > 0 && rubrikTerisi < ASPEK_PENILAIAN.length) {
      setNilaiError("Isi keempat nilai atau kosongkan semuanya.");
      return;
    }
    let penilaian;
    if (rubrikTerisi === ASPEK_PENILAIAN.length) {
      penilaian = {};
      for (const a of ASPEK_PENILAIAN) {
        const n = Number(rubrik[a.kode]);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          setNilaiError(`Nilai ${a.label} harus 0–100.`);
          return;
        }
        penilaian[a.kode] = n;
      }
    }
    const ok = await terima(laporanNilai, penilaian);
    if (ok) {
      tutupTerima();
      flash("Laporan diterima, siswa diberi kabar", IconCheck);
    }
  }

  function bukaRevisi(l) {
    if (pending) return;
    setRevisiId(l.id);
    setRevisiCatatan("");
  }

  function tutupRevisi() {
    setRevisiId(null);
    setRevisiCatatan("");
  }

  async function bukaDetail(l) {
    const seq = ++detailReq.current;
    setDetailId(l.id);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await api(`/api/laporan/${l.id}`);
      if (detailReq.current === seq) setDetailData(res);
    } catch (err) {
      if (detailReq.current === seq) flash(err.message, IconX);
    } finally {
      if (detailReq.current === seq) setDetailLoading(false);
    }
  }

  function tutupDetail() {
    detailReq.current++;
    setDetailId(null);
    setDetailData(null);
    setDetailLoading(false);
  }

  async function kirimRevisi() {
    const nilai = revisiCatatan.trim();
    if (!nilai || !laporanRevisi || pending) return;
    setPending(true);
    try {
      const res = await api(`/api/laporan/${revisiId}/review`, {
        method: "POST",
        body: { aksi: "revisi", catatan: nilai },
      });
      setHasil((prev) => ({
        ...prev,
        [revisiId]: { baris: res.laporan, dasar: serverRows },
      }));
      setCatatan((prev) => ({ ...prev, [revisiId]: nilai }));
      tutupRevisi();
      flash("Revisi diminta, laporan dikembalikan ke siswa", IconEdit);
      laporanQuery.reload();
    } catch (err) {
      flash(err.message, IconX);
      if (err.status) laporanQuery.reload();
    } finally {
      setPending(false);
    }
  }

  const STATS = [
    {
      label: "Menunggu Review",
      value: data.filter((l) => l.status === "terkirim").length,
      sub: "Baru dikirim siswa",
      tone: "bg-sun",
      icon: <IconClock size={18} />,
    },
    {
      label: "Perlu Revisi",
      value: data.filter((l) => l.status === "revisi").length,
      sub: "Menunggu unggahan ulang",
      tone: "bg-tang",
      icon: <IconEdit size={18} />,
    },
    {
      label: "Diterima",
      value: data.filter((l) => l.status === "diterima").length,
      sub: "Selesai direview",
      tone: "bg-mint",
      icon: <IconCheck size={18} />,
    },
  ];

  const memuat =
    (laporanQuery.loading && !laporanQuery.data) ||
    (siswaQuery.loading && !siswaQuery.data);
  const galat = laporanQuery.error || siswaQuery.error;

  if (memuat) return <LoadingBlock label="Memuat laporan PKL…" />;
  if (galat) return <Gagal error={galat} onRetry={cobaLagi} />;

  return (
    <div>
      <PageHeader
        title="Review Laporan PKL"
        desc="Laporan siswa yang menunggu penilaian."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="purple">
              <IconFile size={12} />{" "}
              {
                data.filter(
                  (l) => l.status === "terkirim" || l.status === "revisi"
                ).length
              }{" "}
              perlu tindakan
            </Badge>
            <Btn tone="purple" href="#antrean-review">
              Ke Antrean Review
            </Btn>
          </div>
        }
      />

      <div className="mb-5 max-w-md">
        <Field
          label="Cari laporan"
          hint="Nama siswa, kelas, atau judul laporan."
        >
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="cth. Alya / Laporan Akhir"
          />
        </Field>
      </div>

      {}
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      {}
      <div id="antrean-review" className="mt-8 scroll-mt-6">
        <SectionTitle
          right={
            <span className="text-xs font-bold text-ink/65">
              Terkirim &amp; perlu revisi
            </span>
          }
        >
          Menunggu Review
        </SectionTitle>

        <div className="grid gap-4">
          {review.length === 0 ? (
            <EmptyState
              title="Tidak ada laporan"
              desc={
                q
                  ? "Tidak ada laporan yang cocok dengan pencarian."
                  : "Semua laporan sudah direview. Lihat Riwayat di bawah."
              }
            />
          ) : (
            review.map((l) => {
              const s = identitas(l);
              return (
                <Panel key={l.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-sun px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.nama} size="sm" src={s.akun?.fotoUrl} />
                      <div className="min-w-0">
                        <h3 className="font-display text-base leading-tight">
                          {l.judul}
                        </h3>
                        <p className={MICRO}>
                          {s.nama} · {s.kelas} · v{l.versi}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="white">
                        {l.ukuran || "-"} · {l.halaman ?? "-"} halaman
                      </Badge>
                      <LaporanBadge status={l.status} />
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                    {}
                    <div>
                      <p className={`mb-1.5 ${MICRO}`}>Pratinjau</p>
                      <div className="grid place-items-center rounded-brutal border bg-paper px-4 py-8 text-center">
                        <span className="grid h-12 w-12 place-items-center rounded-brutal bg-white shadow-brutal-sm">
                          <IconFile size={20} />
                        </span>
                        <p className="mt-3 text-sm font-bold tracking-wide">
                          Pratinjau PDF, {l.halaman ?? "-"} halaman
                        </p>
                        <p className="mt-1 text-xs font-medium text-ink/65">
                          {l.ukuran || "-"} · diperbarui{" "}
                          {formatTanggal(l.diperbarui, true)}
                        </p>
                        <Btn
                          tone="white"
                          size="sm"
                          className="mt-3"
                          onClick={() => bukaDetail(l)}
                        >
                          <IconFile size={14} /> Buka Dokumen
                        </Btn>
                      </div>
                    </div>

                    {}
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Btn tone="green" onClick={() => bukaTerima(l)} disabled={pending}>
                          <IconCheck size={16} /> Terima
                        </Btn>
                        <Btn tone="orange" onClick={() => bukaRevisi(l)} disabled={pending}>
                          <IconEdit size={16} /> Minta Revisi
                        </Btn>
                        <span className={MICRO}>Tahap review sekolah</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              );
            })
          )}
        </div>
      </div>

      {}
      <div className="mt-8">
        <SectionTitle
          right={
            <span className="text-xs font-bold text-ink/65">
              {riwayat.length} dokumen
            </span>
          }
        >
          Riwayat
        </SectionTitle>

        <div className="grid gap-3">
          {riwayat.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              desc={
                q
                  ? "Tidak ada laporan yang cocok dengan pencarian."
                  : "Laporan yang sudah diproses akan tampil di sini."
              }
            />
          ) : (
            riwayat.map((l) => {
              const s = identitas(l);
              return (
                <Panel key={l.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base leading-tight">
                          {l.judul}
                        </h3>
                        <LaporanBadge status={l.status} />
                        {l.nilaiAkhir != null ? (
                          <Badge tone="purple">
                            <IconStar size={12} /> Nilai {formatNilai(l.nilaiAkhir)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Avatar name={s.nama} size="sm" src={s.akun?.fotoUrl} />
                        <span className="text-xs font-semibold text-ink/70">
                          {s.nama} · {s.kelas} · v{l.versi} ·{" "}
                          {l.halaman ?? "-"} halaman
                        </span>
                      </div>
                      {l.feedback ? (
                        <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-ink/75">
                          <span className="mt-px shrink-0">
                            <IconEdit size={14} />
                          </span>
                          <span>“{l.feedback}”</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-normal text-ink/65">
                        {formatTanggal(l.diperbarui, true)}
                      </span>
                      <span className={MICRO}>
                        {l.status === "diterima" ? "Diterima" : "Dikembalikan"}
                      </span>
                      <Btn tone="white" size="sm" onClick={() => setTinjauId(l.id)}>
                        Tinjau lagi
                      </Btn>
                    </div>
                  </div>
                </Panel>
              );
            })
          )}
        </div>
      </div>

      {}
      <Modal
        open={detailId !== null}
        onClose={tutupDetail}
        title="Detail Laporan"
        footer={
          <Btn tone="white" onClick={tutupDetail}>
            Tutup
          </Btn>
        }
      >
        {laporanDetail ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={detailIdentitas?.nama ?? "?"} size="lg" />
              <div className="min-w-0">
                <p className="font-display text-lg leading-tight">
                  {laporanDetail.judul}
                </p>
                <p className={`mt-0.5 ${MICRO}`}>
                  {detailIdentitas?.nama ?? "-"} · {detailIdentitas?.kelas ?? "-"} ·
                  v{laporanDetail.versi}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <LaporanBadge status={laporanDetail.status} />
              <Badge tone="white">
                <IconFile size={12} /> {laporanDetail.ukuran || "-"} ·{" "}
                {laporanDetail.halaman ?? "-"} halaman
              </Badge>
            </div>

            <p className="rounded-brutal bg-paper p-2.5 text-xs font-semibold">
              Diperbarui: {formatTanggal(laporanDetail.diperbarui, true) || "-"}
            </p>

            {laporanDetail.feedback ? (
              <p className="rounded-brutal bg-sun/40 p-2.5 text-xs font-semibold">
                Catatan penguji sekolah: “{laporanDetail.feedback}”
              </p>
            ) : null}

            {laporanDetail.jawaban ? (
              <p className="rounded-brutal bg-mint/40 p-2.5 text-xs font-semibold">
                Jawaban siswa: “{laporanDetail.jawaban}”
              </p>
            ) : null}

            {laporanDetail.penilaian ? (
              <div className="rounded-brutal bg-grape/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={MICRO}>Rubrik penilaian</p>
                  <span className="font-display text-xl leading-none">
                    {formatNilai(laporanDetail.nilaiAkhir)}
                    <span className="text-xs text-ink/65"> /100</span>
                  </span>
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {ASPEK_PENILAIAN.map((a) => (
                    <li
                      key={a.kode}
                      className="flex items-center justify-between gap-3 text-xs font-semibold"
                    >
                      <span>{a.label}</span>
                      <span className="font-display text-sm">
                        {formatAngka(laporanDetail.penilaian[a.kode])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className={`mb-1.5 ${MICRO}`}>Riwayat laporan</p>
              {detailLoading && !detailData ? (
                <LoadingBlock label="Memuat riwayat…" />
              ) : (
                <RiwayatLaporan riwayat={riwayatDetail} />
              )}
            </div>

            <p className="text-[11px] font-bold tracking-wide text-ink/65">
              Pratinjau tidak tersedia untuk berkas ini.
            </p>
          </div>
        ) : null}
      </Modal>

      {}
      <Modal
        open={revisiId !== null}
        onClose={tutupRevisi}
        title="Minta Revisi Laporan"
        footer={
          <>
            <Btn tone="white" onClick={tutupRevisi}>
              Batal
            </Btn>
            <Btn tone="orange" onClick={kirimRevisi} disabled={!revisiCatatan.trim() || pending}>
              <IconX size={16} /> Kirim Permintaan
            </Btn>
          </>
        }
      >
        {laporanRevisi ? (
          <>
            <p className="mb-3 rounded-brutal bg-paper p-2.5 text-xs font-semibold">
              {laporanRevisi.judul}, {identitas(laporanRevisi).nama} · v
              {laporanRevisi.versi} · {formatTanggal(laporanRevisi.diperbarui, true)}
            </p>
            {laporanRevisi.jawaban ? (
              <p className="mb-3 rounded-brutal bg-mint/40 p-2.5 text-xs font-semibold">
                Jawaban siswa atas catatan sebelumnya: “{laporanRevisi.jawaban}”
              </p>
            ) : null}
            <Field
              label="Catatan Revisi"
              hint="Wajib. Catatan ikut terkirim ke siswa."
            >
              <Textarea
                rows={4}
                data-autofocus
                value={revisiCatatan}
                onChange={(e) => setRevisiCatatan(e.target.value)}
                placeholder="cth. Tambahkan landasan teori & lampiran screenshot hasil uji coba."
              />
            </Field>
            {!revisiCatatan.trim() ? (
              <p className={`mt-2 ${MICRO}`}>
                Catatan wajib diisi sebelum mengirim.
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>

      {}
      <Modal
        open={nilaiId !== null}
        onClose={tutupTerima}
        title="Terima Laporan & Nilai Rubrik"
        footer={
          <>
            <Btn tone="white" onClick={tutupTerima} disabled={pending}>
              Batal
            </Btn>
            <Btn tone="green" onClick={konfirmasiTerima} disabled={pending}>
              <IconCheck size={16} />{" "}
              {pending
                ? "Menyimpan…"
                : rubrikTerisi === 0
                  ? "Terima tanpa Nilai"
                  : "Terima & Simpan Nilai"}
            </Btn>
          </>
        }
      >
        {laporanNilai ? (
          <div className="grid gap-3">
            <p className="rounded-brutal bg-paper p-2.5 text-xs font-semibold">
              {laporanNilai.judul}, {identitas(laporanNilai).nama} · v
              {laporanNilai.versi} ·{" "}
              {formatTanggal(laporanNilai.diperbarui, true)}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {ASPEK_PENILAIAN.map((a) => (
                <Field key={a.kode} label={a.label} hint="0–100">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    inputMode="numeric"
                    value={rubrik[a.kode] ?? ""}
                    onChange={(e) => ubahNilai(a.kode, e.target.value)}
                    placeholder="-"
                  />
                </Field>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-brutal bg-grape/20 p-3">
              <span className={MICRO}>Rata-rata nilai akhir</span>
              <span className="font-display text-2xl leading-none">
                {rataRubrik != null ? formatNilai(rataRubrik) : "-"}
                <span className="text-xs text-ink/65"> /100</span>
              </span>
            </div>

            <p className="text-xs font-semibold text-ink/70">
              Isi keempat aspek, atau kosongkan semua untuk menerima tanpa
              nilai.
            </p>

            <Field
              label="Pesan untuk siswa"
              hint="Opsional, tersimpan di riwayat."
            >
              <Textarea
                rows={3}
                value={catatan[laporanNilai.id] ?? ""}
                onChange={(e) =>
                  setCatatan((c) => ({ ...c, [laporanNilai.id]: e.target.value }))
                }
                placeholder="cth. Laporan sudah rapi, lanjutkan ke presentasi."
              />
            </Field>

            {nilaiError ? (
              <p
                role="alert"
                className="rounded-brutal bg-cherry/50 p-2.5 text-xs font-bold"
              >
                {nilaiError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <LaporanDetail id={tinjauId} onClose={() => setTinjauId(null)} />

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
