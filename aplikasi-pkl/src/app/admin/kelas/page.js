"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  PageHeader,
  Field,
  Input,
  Badge,
  Modal,
  EmptyState,
  TableWrap,
  Th,
  Td,
  trCls,
  Toast,
  LoadingBlock,
} from "@/components/ui";
import { IconPlus, IconEdit, IconX } from "@/components/icons";
import { useApi, api } from "@/lib/api";

export default function AdminKelasPage() {
  const kelasQuery = useApi("/api/kelas");
  const kelasList = kelasQuery.data?.kelas ?? [];

  const [nama, setNama] = useState("");
  const [pending, setPending] = useState(false);
  const [edit, setEdit] = useState(null);
  const [namaEdit, setNamaEdit] = useState("");
  const [hapus, setHapus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3200);
  }

  async function tambah(e) {
    e.preventDefault();
    const bersih = nama.trim();
    if (!bersih) return;
    setPending(true);
    try {
      const res = await api("/api/kelas", {
        method: "POST",
        body: { nama: bersih },
      });
      setNama("");
      showToast(`+ Kelas "${res.kelas.nama}" ditambahkan`);
      kelasQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPending(false);
    }
  }

  function bukaEdit(k) {
    setEdit(k);
    setNamaEdit(k.nama);
  }

  function tutupEdit() {
    setEdit(null);
    setNamaEdit("");
  }

  async function simpanEdit(e) {
    e.preventDefault();
    if (!edit || !namaEdit.trim()) return;
    setBusy(true);
    try {
      const res = await api(`/api/kelas/${edit.id}`, {
        method: "PATCH",
        body: { nama: namaEdit.trim() },
      });
      tutupEdit();
      showToast(
        `Kelas diubah menjadi "${res.kelas.nama}"` +
          (res.dipindah ? ` · ${res.dipindah} siswa ikut diperbarui` : "")
      );
      kelasQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function hapusKelas() {
    if (!hapus) return;
    setBusy(true);
    try {
      await api(`/api/kelas/${hapus.id}`, { method: "DELETE" });
      showToast(`Kelas "${hapus.nama}" dihapus`);
      setHapus(null);
      kelasQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Kelas Sekolah"
        desc="Kelas yang dipakai data siswa."
      />

      {}
      <Panel className="mb-6 p-4 sm:p-5">
        <form
          onSubmit={tambah}
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <Field
            label="Nama Kelas Baru"
            hint="cth. XII RPL 3. Dipakai di data siswa dan impor Excel."
          >
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="cth. XII RPL 3"
            />
          </Field>
          <Btn
            tone="pink"
            type="submit"
            disabled={pending || !nama.trim()}
          >
            <IconPlus size={16} /> {pending ? "Menyimpan…" : "Tambah Kelas"}
          </Btn>
        </form>
      </Panel>

      {kelasQuery.loading ? (
        <LoadingBlock label="Memuat daftar kelas…" />
      ) : kelasQuery.error ? (
        <Panel role="alert" tone="bg-cherry/40" className="p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-wide">
            Gagal memuat daftar kelas
          </p>
          <p className="mt-1.5 text-sm font-semibold">
            {kelasQuery.error.message}
          </p>
          <Btn
            tone="ink"
            size="sm"
            className="mt-3"
            onClick={() => kelasQuery.reload()}
          >
            Coba lagi
          </Btn>
        </Panel>
      ) : kelasList.length === 0 ? (
        <EmptyState
          title="Belum ada kelas"
          desc="Tambahkan kelas pertama lewat formulir di atas."
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr>
                <Th>Kelas</Th>
                <Th className="w-44">Jumlah Siswa</Th>
                <Th className="w-56">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {kelasList.map((k) => (
                <tr key={k.id} className={trCls}>
                  <Td className="font-bold">{k.nama}</Td>
                  <Td>
                    {k.jmlSiswa > 0 ? (
                      <Badge tone="green">{k.jmlSiswa} siswa</Badge>
                    ) : (
                      <Badge tone="gray">Belum dipakai</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Btn size="sm" tone="yellow" onClick={() => bukaEdit(k)}>
                        <IconEdit size={14} /> Ubah
                      </Btn>
                      <Btn
                        size="sm"
                        tone="white"
                        onClick={() => setHapus(k)}
                        disabled={k.jmlSiswa > 0}
                        title={
                          k.jmlSiswa > 0
                            ? "Pindahkan siswa dulu sebelum menghapus kelas ini."
                            : "Hapus kelas"
                        }
                      >
                        <IconX size={14} /> Hapus
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {}
      <Modal open={!!edit} onClose={tutupEdit} title="Ubah Nama Kelas">
        {edit ? (
          <form onSubmit={simpanEdit} className="grid gap-4">
            <Field
              label="Nama Kelas"
              hint={
                edit.jmlSiswa > 0
                  ? `${edit.jmlSiswa} siswa memakai kelas ini, namanya ikut berubah.`
                  : "Belum ada siswa yang memakai kelas ini."
              }
            >
              <Input
                data-autofocus
                value={namaEdit}
                onChange={(e) => setNamaEdit(e.target.value)}
                required
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn tone="ink" type="submit" disabled={busy || !namaEdit.trim()}>
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
      <Modal open={!!hapus} onClose={() => setHapus(null)} title="Hapus Kelas">
        {hapus ? (
          <div className="grid gap-4">
            <p className="text-sm font-semibold">
              Hapus kelas <b>{hapus.nama}</b>?{" "}
              {hapus.jmlSiswa > 0
                ? `${hapus.jmlSiswa} siswa masih memakainya. Pindahkan mereka dulu.`
                : "Tindakan ini tidak bisa dibatalkan."}
            </p>
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/15 pt-4">
              <Btn
                tone="red"
                onClick={hapusKelas}
                disabled={busy || hapus.jmlSiswa > 0}
              >
                {busy ? "Menghapus…" : "Ya, hapus kelas"}
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
