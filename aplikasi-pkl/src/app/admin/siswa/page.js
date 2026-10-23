"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  PageHeader,
  Field,
  Input,
  Select,
  Chip,
  Avatar,
  Progress,
  Modal,
  EmptyState,
  TableWrap,
  Th,
  Td,
  trCls,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import { IconPlus, IconSearch, IconBook, IconClock, IconUpload, IconGrid, IconGoogle, IconX } from "@/components/icons";
import { useApi, api } from "@/lib/api";
import { NAMA_BULAN_SINGKAT, useHariIni } from "@/lib/tanggal";
import { kehadiranBulanan } from "@/lib/kehadiran";
import ImportSiswaModal from "@/components/import-siswa-modal";
import { DOMAIN_EMAIL } from "@/lib/domain";

const pad = (n) => String(n).padStart(2, "0");

const STATUS_META = {
  aktif: { label: "Aktif", tone: "green" },
  pindah: { label: "Pindah", tone: "orange" },
  nonaktif: { label: "Nonaktif", tone: "gray" },
};

function metaStatus(status) {
  return STATUS_META[status] ?? { label: status || "-", tone: "gray" };
}

function namaSingkat(nama) {
  return nama
    .replace(/^(PT|CV|Bank)\s+/i, "")
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

export default function AdminSiswaPage() {
  const hariIni = useHariIni();
  const periode = hariIni
    ? { tahun: Number(hariIni.slice(0, 4)), bulan: Number(hariIni.slice(5, 7)) }
    : null;

  const siswaQuery = useApi(
    periode
      ? `/api/siswa?stats=1&tahun=${periode.tahun}&bulan=${periode.bulan}`
      : null
  );
  const dudiQuery = useApi("/api/dudi");
  const kelasQuery = useApi("/api/kelas");

  const list = siswaQuery.data?.siswa ?? [];
  const dudiList = dudiQuery.data?.dudi ?? [];
  const stats = siswaQuery.data?.stats ?? {};
  const kelasList = kelasQuery.data?.kelas ?? [];

  const [q, setQ] = useState("");
  const [kelas, setKelas] = useState("semua");
  const [dudiId, setDudiId] = useState("semua");
  const [status, setStatus] = useState("semua");

  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    nis: "",
    kelas: "",
    telepon: "",
    dudiId: "",
    password: "",
  });
  const [pending, setPending] = useState(false);
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [formEdit, setFormEdit] = useState(null);
  const [konfirmasiReset, setKonfirmasiReset] = useState(false);
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pengingatBusy, setPengingatBusy] = useState(null);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  const loading = !periode || siswaQuery.loading || dudiQuery.loading || kelasQuery.loading;
  const error = siswaQuery.error ?? dudiQuery.error ?? kelasQuery.error;

  const dudiAwal = dudiList[0]?.id ?? "";

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  async function kirimPengingat(siswa) {
    if (!siswa.nama) return;
    if (!siswa.telepon) {
      showToast(
        `${siswa.nama} belum punya nomor WhatsApp. Isi nomornya lewat tombol Ubah.`
      );
      return;
    }
    setPengingatBusy(siswa.id);
    try {
      const r = await api("/api/notifikasi/kirim", {
        method: "POST",
        body: {
          mode: "pengingat-jurnal",
          id: siswa.id,
          pesan: `Halo {nama}, jurnal harian PKL kamu belum diisi. Mohon segera mengisi jurnal, ya.`,
        },
      });
      const hasil = r.hasil?.[0];
      if (hasil?.status === "terkirim") {
        showToast(`Pengingat terkirim ke ${siswa.nama}.`);
      } else if (r.total === 0) {
        showToast("Tidak ada yang dikirim.");
      } else {
        showToast(
          `Pengingat dicatat untuk ${siswa.nama}, WhatsApp belum terkirim` +
            (hasil?.error ? `: ${hasil.error}` : ".")
        );
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setPengingatBusy(null);
    }
  }

  async function submitSiswa(e) {
    e.preventDefault();
    if (!form.nama.trim() || !form.nis.trim()) return;
    const nis = form.nis.trim();
    const sandiAwal = form.password.trim() || nis;
    setPending(true);
    try {
      await api("/api/siswa", {
        method: "POST",
        body: {
          nama: form.nama.trim(),
          nis,
          kelas: form.kelas.trim(),
          telepon: form.telepon.trim() || undefined,
          dudiId: form.dudiId || dudiAwal,
          password: form.password.trim() || undefined,
        },
      });
      setOpenAdd(false);
      setForm({ nama: "", nis: "", kelas: "", telepon: "", dudiId: "", password: "" });
      showToast(
        `+ Siswa ditambahkan · akun ${nis}@${DOMAIN_EMAIL} · sandi ${sandiAwal}`
      );
      siswaQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  function bukaEdit(s) {
    setDetail(null);
    setEdit(s);
    setFormEdit({
      nama: s.nama,
      kelas: s.kelas,
      telepon: s.telepon ?? "",
      dudiId: s.dudiId ?? "",
      status: s.status,
    });
    setKonfirmasiReset(false);
  }

  function tutupEdit() {
    if (busy) return;
    setEdit(null);
    setFormEdit(null);
    setKonfirmasiReset(false);
  }

  async function simpanEdit(e) {
    e.preventDefault();
    if (!edit || !formEdit) return;
    const nama = formEdit.nama.trim();
    if (!nama) return;
    const kelasBaru = formEdit.kelas.trim() || "Belum ditentukan";
    const dudiBaru = formEdit.dudiId || null;
    const patch = {};
    if (nama !== edit.nama) patch.nama = nama;
    if (kelasBaru !== (edit.kelas || "Belum ditentukan")) patch.kelas = kelasBaru;
    if ((formEdit.telepon ?? "").trim() !== (edit.telepon ?? ""))
      patch.telepon = formEdit.telepon.trim();
    if (dudiBaru !== (edit.dudiId ?? null)) patch.dudiId = dudiBaru;
    if (formEdit.status !== edit.status) patch.status = formEdit.status;
    if (Object.keys(patch).length === 0) {
      showToast("Tidak ada perubahan untuk disimpan");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/siswa/${edit.id}`, { method: "PATCH", body: patch });
      showToast(`Data ${nama} disimpan`);
      setEdit(null);
      setFormEdit(null);
      setKonfirmasiReset(false);
      siswaQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetSandi() {
    if (!edit) return;
    setBusy(true);
    try {
      await api(`/api/siswa/${edit.id}`, {
        method: "PATCH",
        body: { resetSandi: true },
      });
      showToast(`Sandi ${edit.nama} direset. Kini sama dengan NIS ${edit.nis}`);
      setKonfirmasiReset(false);
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  function tutupHapus() {
    if (busy) return;
    setHapus(null);
  }

  async function putusGoogleSiswa(akun) {
    if (!akun?.id) return;
    if (
      !window.confirm(
        `Putuskan tautan Google (${akun.googleEmail ?? "-"}) dari akun siswa ini?`
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
      showToast("Tautan Google siswa diputus");
      setEdit((e) => (e ? { ...e, akun: { ...e.akun, googleEmail: null } } : e));
      siswaQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setBusy(true);
    try {
      await api(`/api/siswa/${hapus.id}`, { method: "DELETE" });
      showToast(`${hapus.nama} dihapus`);
      setHapus(null);
      siswaQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const kelasOptions = kelasList
    .map((k) => k.nama)
    .sort((a, b) => a.localeCompare(b, "id"));

  const TANPA_MITRA = "__tanpa__";

  const rows = list.filter((s) => {
    const kata = q.trim().toLowerCase();
    const cocokQ =
      !kata || s.nama.toLowerCase().includes(kata) || s.nis.includes(kata);
    const cocokKelas = kelas === "semua" || s.kelas === kelas;
    const cocokDudi =
      dudiId === "semua" ||
      (dudiId === TANPA_MITRA ? !s.dudiId : s.dudiId === dudiId);
    const cocokStatus = status === "semua" || s.status === status;
    return cocokQ && cocokKelas && cocokDudi && cocokStatus;
  });

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        desc="Siswa, tempat praktik, dan kehadirannya."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Btn tone="white" href="/admin/kelas">
              <IconGrid size={16} /> Kelola Kelas
            </Btn>
            <Btn tone="white" onClick={() => setOpenImport(true)}>
              <IconUpload size={16} /> Import Excel
            </Btn>
            <Btn tone="pink" onClick={() => setOpenAdd(true)}>
              <IconPlus size={16} /> Tambah Siswa
            </Btn>
          </div>
        }
      />

      {}
      <Panel className="mb-6 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Cari Siswa" className="md:col-span-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <IconSearch size={16} />
              </span>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nama atau NIS…"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Filter Kelas">
            <Select value={kelas} onChange={(e) => setKelas(e.target.value)}>
              <option value="semua">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Filter DUDI">
            <Select value={dudiId} onChange={(e) => setDudiId(e.target.value)}>
              <option value="semua">Semua DUDI</option>
              <option value={TANPA_MITRA}>Belum ada mitra</option>
              {dudiList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-ink/70">
            Status
          </span>
          {[
            { key: "semua", label: "Semua" },
            { key: "aktif", label: "Aktif" },
            { key: "pindah", label: "Pindah" },
            { key: "nonaktif", label: "Nonaktif" },
          ].map((s) => (
            <Chip
              key={s.key}
              active={status === s.key}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </Chip>
          ))}
          <span className="ml-auto text-[11px] font-bold tracking-wide text-ink/70">
            {rows.length} siswa ditampilkan
          </span>
        </div>
      </Panel>

      {loading ? (
        <LoadingBlock label="Memuat data siswa…" />
      ) : error ? (
        <Panel role="alert" tone="bg-cherry/40" className="p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat data siswa
          </p>
          <p className="mt-1.5 text-sm font-semibold">{error.message}</p>
          <Btn
            tone="ink"
            size="sm"
            className="mt-3"
            onClick={() => {
              siswaQuery.reload();
              dudiQuery.reload();
              kelasQuery.reload();
            }}
          >
            Coba lagi
          </Btn>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tidak ada siswa yang cocok"
          desc="Ubah kata kunci atau reset filter."
          action={
            <Btn
              tone="yellow"
              onClick={() => {
                setQ("");
                setKelas("semua");
                setDudiId("semua");
                setStatus("semua");
                showToast("Filter direset");
              }}
            >
              Reset Filter
            </Btn>
          }
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead>
              <tr>
                <Th className="w-14">No</Th>
                <Th>Nama</Th>
                <Th>NIS</Th>
                <Th>Kelas</Th>
                <Th>DUDI</Th>
                <Th>
                  Kehadiran
                  {periode ? ` ${NAMA_BULAN_SINGKAT[periode.bulan - 1]}` : ""}
                </Th>
                <Th>Status</Th>
                <Th className="text-right!">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
                const dudi = s.dudiId
                  ? dudiList.find((d) => d.id === s.dudiId)
                  : null;
                const namaMitra = dudi?.nama ?? s.dudiNama ?? "";
                const ke = kehadiranBulanan(stats[s.id], { ...periode, hariIni });
                const st = metaStatus(s.status);
                return (
                  <tr
                    key={s.id}
                    className={`${trCls} cursor-pointer`}
                    tabIndex={0}
                    aria-label={`Buka detail ${s.nama}`}
                    onClick={() => setDetail(s)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetail(s);
                      }
                    }}
                  >
                    <Td className="font-display">{i + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.nama} size="sm" src={s.akun?.fotoUrl} />
                        <span className="font-bold">{s.nama}</span>
                      </div>
                    </Td>
                    <Td className="font-semibold text-ink/75">{s.nis}</Td>
                    <Td className="font-semibold">{s.kelas}</Td>
                    <Td>
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          className={`h-3 w-3 shrink-0 rounded-full ${dudi?.tone ?? "bg-white"}`}
                        />
                        {namaMitra ? namaSingkat(namaMitra) : "Belum ada mitra"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-display">{ke.ada ? `${ke.pct}%` : "-"}</span>
                      <span className="ml-1 text-[11px] font-bold text-ink/65">
                        {ke.ada ? `(${ke.bulan} hari)` : ""}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Btn
                          size="sm"
                          tone="white"
                          aria-label={`Detail ${s.nama}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail(s);
                          }}
                        >
                          Detail
                        </Btn>
                        <Btn
                          size="sm"
                          tone="white"
                          aria-label={`Ubah ${s.nama}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            bukaEdit(s);
                          }}
                        >
                          Ubah
                        </Btn>
                        <Btn
                          size="sm"
                          tone="green"
                          aria-label={`Kirim pengingat jurnal ke ${s.nama}`}
                          disabled={pengingatBusy === s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            kirimPengingat(s);
                          }}
                        >
                          {pengingatBusy === s.id ? "Mengirim…" : "Pengingat"}
                        </Btn>
                        <Btn
                          size="sm"
                          tone="red"
                          aria-label={`Hapus ${s.nama}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHapus(s);
                          }}
                        >
                          Hapus
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Siswa">
        <form onSubmit={submitSiswa} className="grid gap-4">
          <Field label="Nama Lengkap">
            <Input
              data-autofocus
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="cth. Alya Putri Ramadhani"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NIS">
              <Input
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}
                placeholder="cth. 2401011"
                required
              />
            </Field>
            <Field
              label="Kelas"
              hint="Daftar kelas diatur admin di halaman Kelola Kelas."
            >
              <Select
                value={form.kelas}
                onChange={(e) => setForm({ ...form, kelas: e.target.value })}
              >
                <option value="">- belum ditentukan -</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Nomor WhatsApp (opsional)"
            hint="Dipakai bot untuk pemberitahuan dan pengingat."
          >
            <Input
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="cth. 0812-3456-7890"
              inputMode="tel"
            />
          </Field>
          <Field
            label="Kata Sandi Awal (opsional)"
            hint={`Akun login dibuat otomatis: NIS@${DOMAIN_EMAIL}. Sandi awal otomatis NIS bila dikosongkan.`}
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="kosongkan = sandi awal = NIS"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Pilih DUDI" hint="Tempat pelaksanaan praktik kerja lapangan.">
            <Select
              value={form.dudiId || dudiAwal}
              onChange={(e) => setForm({ ...form, dudiId: e.target.value })}
            >
              {dudiList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}, {d.kota}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
            <Btn tone="ink" type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan Siswa"}
            </Btn>
            <Btn tone="white" onClick={() => setOpenAdd(false)}>
              Batal
            </Btn>
          </div>
        </form>
      </Modal>

      {}
      <ImportSiswaModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        nisTerdaftar={list.map((s) => s.nis)}
        mitraDikenal={dudiList.map((d) => d.nama)}
        kelasDikenal={kelasOptions}
        onSelesai={(r) => {
          siswaQuery.reload();
          showToast(
            `Impor selesai: +${r.dibuat} siswa` +
              (r.lewat ? ` · ${r.lewat} dilewati` : "") +
              (r.galat ? ` · ${r.galat} galat` : "")
          );
        }}
      />

      {}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Siswa"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            {detail ? (
              <Btn tone="yellow" onClick={() => bukaEdit(detail)}>
                Ubah
              </Btn>
            ) : null}
            <Btn tone="ink" data-autofocus onClick={() => setDetail(null)}>
              Tutup
            </Btn>
          </div>
        }
      >
        {detail ? (
          (() => {
            const dudi = detail.dudiId
              ? dudiList.find((d) => d.id === detail.dudiId)
              : null;
            const namaMitra = dudi?.nama ?? detail.dudiNama ?? "";
            const ke = kehadiranBulanan(stats[detail.id], { ...periode, hariIni });
            const st = metaStatus(detail.status);
            return (
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={detail.nama} size="lg" />
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-tight">
                      {detail.nama}
                    </p>
                    <p className="text-[11px] font-bold tracking-wide text-ink/70">
                      NIS {detail.nis} · {detail.kelas}
                    </p>
                    {detail.telepon ? (
                      <p className="mt-0.5 text-[11px] font-bold tracking-wide text-ink/70">
                        WA {detail.telepon}
                      </p>
                    ) : null}
                    <div className="mt-1.5">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-brutal bg-paper p-3">
                    <p className="text-[11px] font-bold tracking-wide text-ink/70">
                      Jurnal Ditulis
                    </p>
                    <p className="font-display mt-1 text-2xl leading-none">
                      {ke.ada ? ke.jml : "-"}
                    </p>
                  </div>
                  <div className="rounded-brutal bg-paper p-3">
                    <p className="text-[11px] font-bold tracking-wide text-ink/70">
                      Hari Hadir
                      {periode ? ` ${NAMA_BULAN_SINGKAT[periode.bulan - 1]}` : ""}
                    </p>
                    <p className="font-display mt-1 text-2xl leading-none">
                      {ke.ada ? ke.bulan : "-"}
                    </p>
                  </div>
                  <div className="rounded-brutal bg-paper p-3">
                    <p className="text-[11px] font-bold tracking-wide text-ink/70">
                      Kehadiran
                    </p>
                    <p className="font-display mt-1 text-2xl leading-none">
                      {ke.ada ? `${ke.pct}%` : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold tracking-wide">
                    <span>Progress kehadiran</span>
                    <span>{ke.ada ? `${ke.pct}%` : "-"}</span>
                  </div>
                  <Progress
                    value={ke.pct}
                    tone={ke.pct >= 75 ? "bg-mint" : ke.pct >= 50 ? "bg-sun" : "bg-cherry"}
                  />
                </div>

                <div
                  className={`rounded-brutal p-3 ${dudi?.tone ?? "bg-paper"}`}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
                    <IconBook size={14} /> Tempat PKL
                  </p>
                  <p className="font-display mt-1 text-lg leading-tight">
                    {namaMitra || "Belum ada mitra"}
                  </p>
                  {dudi ? (
                    <>
                      <p className="mt-1 text-sm font-semibold">{dudi.alamat}</p>
                      <p className="mt-2 text-xs font-bold tracking-wide">
                        Pembimbing: {dudi.pembimbing || "-"} ·{" "}
                        <span className="inline-flex items-center gap-1">
                          <IconClock size={13} /> {dudi.jam || "-"}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold">
                      Siswa ini belum ditempatkan di mitra mana pun.
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>

      {}
      <Modal open={!!edit} onClose={tutupEdit} title="Ubah Data Siswa">
        {edit && formEdit ? (
          <form onSubmit={simpanEdit} className="grid gap-4">
            <Field label="Nama Lengkap">
              <Input
                data-autofocus
                value={formEdit.nama}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, nama: e.target.value })
                }
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="NIS"
                hint="NIS tidak bisa diubah, dipakai sebagai akun dan sandi awal."
              >
                <Input value={edit.nis} disabled className="opacity-60" />
              </Field>
              <Field
                label="Kelas"
                hint="Daftar kelas diatur admin di halaman Kelola Kelas."
              >
                <Select
                  value={
                    formEdit.kelas === "Belum ditentukan" ? "" : formEdit.kelas
                  }
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, kelas: e.target.value })
                  }
                >
                  <option value="">- belum ditentukan -</option>
                  {formEdit.kelas &&
                  formEdit.kelas !== "Belum ditentukan" &&
                  !kelasOptions.includes(formEdit.kelas) ? (
                    <option value={formEdit.kelas}>
                      {formEdit.kelas} (di luar daftar kelas)
                    </option>
                  ) : null}
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Nomor WhatsApp (opsional)"
              hint="Dipakai bot untuk pemberitahuan dan pengingat."
            >
              <Input
                value={formEdit.telepon}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, telepon: e.target.value })
                }
                placeholder="cth. 0812-3456-7890"
                inputMode="tel"
              />
            </Field>
            <Field
              label="Mitra DUDI"
              hint="Pilih “- tanpa mitra -” untuk melepas penempatan."
            >
              <Select
                value={formEdit.dudiId}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, dudiId: e.target.value })
                }
              >
                <option value="">- tanpa mitra -</option>
                {dudiList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}, {d.kota}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Status"
              hint="Nonaktif mengeluarkan siswa dari hitungan kehadiran."
            >
              <Select
                value={formEdit.status}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, status: e.target.value })
                }
              >
                {formEdit.status !== "aktif" && formEdit.status !== "nonaktif" ? (
                  <option value={formEdit.status} disabled>
                    {formEdit.status}, pilih status baru untuk mengubah
                  </option>
                ) : null}
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>

            <div className="rounded-brutal border bg-paper p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink/70">
                <IconGoogle size={12} /> Akun Google Siswa
              </p>
              {edit.akun?.googleEmail ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    Terhubung: <b>{edit.akun.googleEmail}</b>
                  </p>
                  <Btn
                    size="sm"
                    tone="white"
                    onClick={() => putusGoogleSiswa(edit.akun)}
                    disabled={busy}
                  >
                    <IconX size={12} /> Putuskan
                  </Btn>
                </div>
              ) : (
                <p className="mt-1 text-xs font-semibold text-ink/70">
                  Belum ada akun Google yang dihubungkan siswa ini. Siswa bisa
                  menghubungkannya sendiri dari menu Akun &amp; Keamanan.
                </p>
              )}
            </div>

            <div className="rounded-brutal border bg-paper p-3">
              <p className="text-[11px] font-bold tracking-wide text-ink/70">
                Reset Sandi
              </p>
              <p className="mt-1 text-xs font-semibold text-ink/70">
                Sandi akun {edit.nis}@{DOMAIN_EMAIL} akan dikembalikan
                ke NIS, yaitu <b>{edit.nis}</b>.
              </p>
              {konfirmasiReset ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold">
                    Yakin reset sandi {edit.nama}?
                  </span>
                  <Btn
                    size="sm"
                    tone="red"
                    onClick={resetSandi}
                    disabled={busy}
                  >
                    {busy ? "Memproses…" : "Ya, reset sandi"}
                  </Btn>
                  <Btn
                    size="sm"
                    tone="white"
                    onClick={() => setKonfirmasiReset(false)}
                    disabled={busy}
                  >
                    Batal
                  </Btn>
                </div>
              ) : (
                <Btn
                  size="sm"
                  tone="yellow"
                  className="mt-2"
                  onClick={() => setKonfirmasiReset(true)}
                >
                  Reset sandi ke NIS
                </Btn>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="ink" type="submit" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan Perubahan"}
              </Btn>
              <Btn tone="white" onClick={tutupEdit} disabled={busy}>
                Batal
              </Btn>
            </div>
          </form>
        ) : null}
      </Modal>

      {}
      <Modal open={!!hapus} onClose={tutupHapus} title="Hapus Siswa">
        {hapus ? (
          <div className="grid gap-4">
            <p className="text-sm font-semibold">
              Hapus <b>{hapus.nama}</b> (NIS {hapus.nis})? Tindakan ini
              permanen dan ikut menghapus:
            </p>
            <ul className="grid gap-1.5 rounded-brutal border bg-paper p-3 text-sm font-semibold">
              <li>• akun login {hapus.nis}@{DOMAIN_EMAIL}</li>
              <li>• seluruh jurnal harian siswa</li>
              <li>• seluruh laporan</li>
              <li>• riwayat check-in</li>
            </ul>
            <p className="text-xs font-bold tracking-wide text-ink/70">
              Tidak dapat dikembalikan.
            </p>
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="red" onClick={konfirmasiHapus} disabled={busy}>
                {busy ? "Menghapus…" : "Ya, hapus permanen"}
              </Btn>
              <Btn tone="white" onClick={tutupHapus} disabled={busy}>
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
