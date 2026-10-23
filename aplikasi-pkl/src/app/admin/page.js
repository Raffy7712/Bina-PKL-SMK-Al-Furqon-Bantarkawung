"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Stat,
  PageHeader,
  SectionTitle,
  BarChart,
  Field,
  Input,
  Select,
  Modal,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import {
  IconUsers,
  IconBuilding,
  IconBook,
  IconClock,
  IconFile,
  IconCheck,
  IconBell,
  IconShield,
  IconPlus,
  IconChart,
} from "@/components/icons";
import { HARI, BULAN } from "@/lib/calc";
import { NAMA_BULAN, formatTanggalPendek, waktuLalu } from "@/lib/tanggal";
import { useApi, api } from "@/lib/api";
import { DOMAIN_EMAIL } from "@/lib/domain";

function jurnal7Hari(sparkline) {
  if (!sparkline.length) return { data: [], rentang: "" };
  const data = sparkline.map((p) => {
    const [y, m, d] = p.tanggal.split("-").map(Number);
    const t = new Date(y, m - 1, d);
    return {
      label: HARI[t.getDay()].slice(0, 3),
      value: p.n,
      hari: t.getDate(),
      bulan: t.getMonth(),
    };
  });
  const rentang =
    data[0].bulan === data[6].bulan
      ? `${data[0].hari} – ${data[6].hari} ${BULAN[data[6].bulan].slice(0, 3)}`
      : `${data[0].hari} ${BULAN[data[0].bulan].slice(0, 3)} – ${data[6].hari} ${BULAN[data[6].bulan].slice(0, 3)}`;
  return { data, rentang };
}

const AKSI_TONE = {
  jurnal: "yellow",
  "verifikasi-dudi": "green",
  "verifikasi-sekolah": "green",
  laporan: "blue",
  siswa: "pink",
  mitra: "purple",
  "akun-sekolah": "purple",
};

const LABEL_WA = {
  terkirim: "terkirim",
  gagal: "gagal",
  menunggu: "menunggu",
  tanpa_nomor: "tanpa nomor",
  nomor_tidak_valid: "nomor salah",
};

export default function AdminDashboard() {
  const siswaQuery = useApi("/api/siswa");
  const dudiQuery = useApi("/api/dudi");
  const kelasQuery = useApi("/api/kelas");
  const ringkasQuery = useApi("/api/ringkas");
  const waLogQuery = useApi("/api/notifikasi/log?limit=6");

  const siswa = siswaQuery.data?.siswa ?? [];
  const dudi = dudiQuery.data?.dudi ?? [];
  const kelasList = kelasQuery.data?.kelas ?? [];
  const ringkas = ringkasQuery.data;

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    nis: "",
    kelas: "",
    telepon: "",
    dudiId: "",
    password: "",
  });
  const [pengingatBusy, setPengingatBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  const loading =
    siswaQuery.loading || dudiQuery.loading || kelasQuery.loading || ringkasQuery.loading;
  const error =
    siswaQuery.error ?? dudiQuery.error ?? kelasQuery.error ?? ringkasQuery.error;

  const dudiAwal = dudi[0]?.id ?? "";

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  function muatUlang() {
    siswaQuery.reload();
    dudiQuery.reload();
    kelasQuery.reload();
    ringkasQuery.reload();
    waLogQuery.reload();
  }

  async function kirimPengingat(semua = false) {
    setPengingatBusy(true);
    try {
      const res = await api("/api/notifikasi/kirim", {
        method: "POST",
        body: { mode: "pengingat-jurnal", semua },
      });
      if (res.total === 0) {
        showToast("Belum ada siswa aktif yang ditempatkan di mitra.");
        return;
      }
      showToast(
        `Pengingat selesai: ${res.terkirim} terkirim` +
          (res.tanpaNomor ? ` · ${res.tanpaNomor} tanpa nomor WA` : "") +
          (res.gagal ? ` · ${res.gagal} gagal` : "") +
          (res.dilewati ? ` · ${res.dilewati} dilewati (kuota bot)` : "")
      );
      waLogQuery.reload();
      ringkasQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPengingatBusy(false);
    }
  }

  async function submitSiswa(e) {
    e.preventDefault();
    if (!form.nama.trim() || !form.nis.trim()) return;
    const nama = form.nama.trim();
    const nis = form.nis.trim();
    const sandiAwal = form.password.trim() || nis;
    const dudiId = form.dudiId || dudiAwal;
    setPending(true);
    try {
      await api("/api/siswa", {
        method: "POST",
        body: {
          nama,
          nis,
          kelas: form.kelas.trim(),
          telepon: form.telepon.trim() || undefined,
          dudiId,
          password: form.password.trim() || undefined,
        },
      });
      ringkasQuery.reload();
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

  const menungguDudi = ringkas?.jurnal.menunggu_dudi ?? 0;
  const menungguSekolah = ringkas?.jurnal.menunggu_sekolah ?? 0;
  const revisi = ringkas?.laporan.revisi ?? 0;
  const jurnalBulan = ringkas?.jurnal.bulan ?? null;
  const periodeJurnal = ringkas?.jurnal.periode ?? null;
  const [tahunJurnal, bulanJurnal] = periodeJurnal
    ? periodeJurnal.split("-").map(Number)
    : [null, null];
  const labelJurnal = periodeJurnal
    ? `Jurnal ${NAMA_BULAN[bulanJurnal - 1]} ${tahunJurnal}`
    : "Jurnal (bulan data terakhir)";

  const kehadiran = ringkas?.kehadiran ?? null;
  const basisHadir = kehadiran ? kehadiran.hariKerja * kehadiran.siswa : 0;
  const adaKehadiran = !!kehadiran && kehadiran.hariKerja > 0 && kehadiran.siswa > 0;

  const hariIniRingkas = ringkas?.hariIni ?? null;
  const belumHariIni = hariIniRingkas?.belum ?? 0;
  const adaSiswaMitra = (hariIniRingkas?.total ?? 0) > 0;
  const waLog = waLogQuery.data?.notifikasi ?? [];

  const { data: chartData, rentang } = jurnal7Hari(ringkas?.sparkline ?? []);

  const stats = [
    {
      label: "Siswa aktif",
      value: siswa.filter((s) => s.status === "aktif").length,
      sub: `dari ${siswa.length} siswa terdaftar`,
      tone: "bg-sun",
      icon: <IconUsers size={18} />,
    },
    {
      label: "Mitra DUDI",
      value: dudi.length,
      sub: `${new Set(dudi.map((d) => d.kota)).size} kota, siap terima siswa`,
      tone: "bg-marine",
      icon: <IconBuilding size={18} />,
    },
    {
      label: labelJurnal,
      value: jurnalBulan ? jurnalBulan.total : 0,
      sub: "entri pada periode data terakhir",
      tone: "bg-mint",
      icon: <IconBook size={18} />,
    },
    {
      label: "Menunggu verifikasi",
      value: menungguDudi + menungguSekolah,
      sub: `${menungguDudi} di DUDI, ${menungguSekolah} di sekolah`,
      tone: "bg-tang",
      icon: <IconClock size={18} />,
    },
    {
      label: "Laporan masuk",
      value: ringkas?.laporan.total ?? 0,
      sub: `${revisi} menunggu revisi`,
      tone: "bg-candy",
      icon: <IconFile size={18} />,
    },
    {
      label: "Kehadiran",
      value: adaKehadiran ? `${kehadiran.persen}%` : "-",
      sub: adaKehadiran
        ? `${kehadiran.hadir} dari ${basisHadir} hari-siswa (hari kerja × siswa aktif)`
        : "belum ada data jurnal",
      tone: "bg-grape",
      icon: <IconCheck size={18} />,
    },
  ];

  const aktivitas = ringkas?.aktivitas ?? [];

  return (
    <div>
      <PageHeader
        title="Dasbor Admin"
        desc="Keadaan PKL hari ini: jurnal, verifikasi, laporan, kehadiran."
        action={
          <Btn tone="pink" onClick={() => setOpenAdd(true)}>
            <IconPlus size={16} /> Tambah Siswa
          </Btn>
        }
      />

      {loading ? (
        <LoadingBlock label="Memuat dasbor…" />
      ) : error ? (
        <Panel role="alert" tone="bg-cherry/40" className="p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat dasbor
          </p>
          <p className="mt-1.5 text-sm font-semibold">{error.message}</p>
          <Btn tone="ink" size="sm" className="mt-3" onClick={muatUlang}>
            Coba lagi
          </Btn>
        </Panel>
      ) : (
        <>
          {}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {}
            <div className="grid gap-5 lg:col-span-2">
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-sun px-4 py-3">
                  <h2 className="font-display flex items-center gap-2 text-lg">
                    <IconChart size={18} /> Jurnal 7 Hari Terakhir
                  </h2>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold">
                    {rentang || "-"}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <BarChart data={chartData} tone="bg-marine" />
                </div>
              </Panel>

              <Panel className="p-4 sm:p-5">
                <SectionTitle
                  right={
                    <span className="text-[11px] font-bold tracking-wide text-ink/70">
                      {aktivitas.length} entri
                    </span>
                  }
                >
                  Aktivitas Terbaru
                </SectionTitle>
                <ul className="grid gap-3">
                  {aktivitas.length === 0 && (
                    <li className="text-xs font-semibold text-ink/65">
                      Belum ada aktivitas.
                    </li>
                  )}
                  {aktivitas.map((a, i) => (
                    <li
                      key={a.id}
                      className={`flex flex-wrap items-center gap-2 ${
                        i < aktivitas.length - 1
                          ? "border-b-2 pb-3"
                          : ""
                      }`}
                    >
                      <Badge tone={AKSI_TONE[a.kategori] ?? "yellow"}>{a.aksi}</Badge>
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {a.detail}
                      </span>
                      <span className="text-[11px] font-bold tracking-wide text-ink/70">
                        {waktuLalu(a.waktu)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            {}
            <div className="grid content-start gap-5">
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-marine px-4 py-3">
                  <h2 className="font-display flex items-center gap-2 text-lg text-white">
                    <IconBell size={18} /> Notifikasi WhatsApp
                  </h2>
                  <Btn size="sm" tone="white" href="/admin/notifikasi">
                    Buka
                  </Btn>
                </div>
                <ul className="grid gap-3 p-4 sm:p-5">
                  {waLogQuery.loading ? (
                    <li className="text-xs font-semibold text-ink/65">Memuat…</li>
                  ) : waLog.length === 0 ? (
                    <li className="text-xs font-semibold text-ink/65">
                      Belum ada pengiriman WhatsApp.
                    </li>
                  ) : (
                    waLog.map((n) => (
                      <li key={n.id} className="flex items-start gap-2.5">
                        <span
                          className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                            n.waStatus === "terkirim"
                              ? "bg-mint"
                              : n.waStatus === "gagal" || n.waStatus === "nomor_tidak_valid"
                                ? "bg-cherry"
                                : "bg-sun"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug">
                            {n.judul}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold tracking-wide text-ink/65">
                            {n.tujuan ?? "-"} · {waktuLalu(n.dibuat)} ·{" "}
                            {LABEL_WA[n.waStatus] ?? n.waStatus ?? "-"}
                          </p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </Panel>

              <Panel
                tone={!adaSiswaMitra ? "bg-white" : belumHariIni ? "bg-sun/70" : "bg-mint"}
                className="p-4 sm:p-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-brutal bg-white shadow-brutal-sm">
                    <IconShield size={16} />
                  </span>
                  <p className="text-[11px] font-bold tracking-wide">
                    Pengingat Jurnal
                  </p>
                </div>
                {ringkasQuery.loading ? (
                  <p className="mt-3 text-sm font-semibold">Memuat…</p>
                ) : (
                  <>
                    <p className="font-display mt-3 text-lg leading-snug">
                      {!adaSiswaMitra
                        ? "Belum ada siswa aktif di mitra"
                        : belumHariIni > 0
                          ? `${belumHariIni} siswa belum isi jurnal hari ini`
                          : "Semua siswa sudah isi jurnal hari ini"}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {adaSiswaMitra
                        ? `${hariIniRingkas.sudah} dari ${hariIniRingkas.total} siswa sudah masuk, jurnal ${formatTanggalPendek(hariIniRingkas.tanggal)}.`
                        : "Tambahkan siswa lalu pasangkan mitra DUDI-nya dulu."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Btn
                        tone="ink"
                        size="sm"
                        disabled={pengingatBusy}
                        onClick={() => kirimPengingat(false)}
                      >
                        <IconBell size={14} />{" "}
                        {pengingatBusy ? "Mengirim…" : "Kirim Pengingat"}
                      </Btn>
                      {belumHariIni === 0 && hariIniRingkas?.total > 0 ? (
                        <Btn
                          tone="white"
                          size="sm"
                          disabled={pengingatBusy}
                          onClick={() => kirimPengingat(true)}
                        >
                          Kirim ulang ke semua
                        </Btn>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] font-bold tracking-wide text-ink/65">
                      Tanpa pilihan, hanya yang belum mengisi jurnal hari ini.
                      Lewat Data Siswa bisa kirim ke satu siswa.
                    </p>
                  </>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}

      {}
      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Tambah Siswa"
      >
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
              hint="Daftar kelas diatur di halaman Kelola Kelas."
            >
              <Select
                value={form.kelas}
                onChange={(e) => setForm({ ...form, kelas: e.target.value })}
              >
                <option value="">- belum ditentukan -</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.nama}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Nomor WhatsApp (opsional)"
            hint="Dipakai bot untuk pemberitahuan dan pengingat.">
            <Input
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              placeholder="cth. 0812-3456-7890"
              inputMode="tel"
            />
          </Field>
          <Field
            label="Kata Sandi Awal (opsional)"
            hint={`Akun login dibuat otomatis: NIS@${DOMAIN_EMAIL}, sandi awal otomatis = NIS bila dikosongkan.`}
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
              {dudi.map((d) => (
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

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
