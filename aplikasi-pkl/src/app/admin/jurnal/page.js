"use client";

import { useState } from "react";
import {
  Panel,
  Btn,
  PageHeader,
  Field,
  Input,
  Select,
  Badge,
  Chip,
  EmptyState,
  TableWrap,
  Th,
  Td,
  trCls,
  LoadingBlock,
  LaporanBadge,
} from "@/components/ui";
import { IconFile, IconSearch } from "@/components/icons";
import { JurnalDetail, LaporanDetail } from "@/components/detail-tinjauan";
import { useApi } from "@/lib/api";
import { formatTanggal } from "@/lib/calc";

const MICRO =
  "text-[11px] font-medium text-ink/65";

const TAB = [
  { key: "jurnal", label: "Jurnal" },
  { key: "laporan", label: "Laporan" },
];

const STATUS_JURNAL = [
  { key: "", label: "Semua" },
  { key: "menunggu_dudi", label: "Menunggu DUDI" },
  { key: "menunggu_sekolah", label: "Menunggu sekolah" },
  { key: "diterima", label: "Diterima" },
  { key: "ditolak", label: "Ditolak" },
];

const STATUS_LAPORAN = [
  { key: "", label: "Semua" },
  { key: "draft", label: "Draft" },
  { key: "terkirim", label: "Terkirim" },
  { key: "revisi", label: "Revisi" },
  { key: "diterima", label: "Diterima" },
];

function Gagal({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-brutal bg-cherry/20 p-5">
      <p className={MICRO}>Gagal memuat data</p>
      <p className="mt-1 text-sm font-normal">{error?.message ?? "Permintaan gagal."}</p>
      <Btn tone="white" size="sm" className="mt-3" onClick={onRetry}>
        Coba lagi
      </Btn>
    </div>
  );
}

export default function AdminTinjauPage() {
  const [tab, setTab] = useState("jurnal");
  const [status, setStatus] = useState("");
  const [bulan, setBulan] = useState("");
  const [cari, setCari] = useState("");
  const [jurnalId, setJurnalId] = useState(null);
  const [laporanId, setLaporanId] = useState(null);

  const jurnalQ = useApi(
    `/api/jurnal?limit=500${status ? `&status=${status}` : ""}${bulan ? `&bulan=${bulan}` : ""}`
  );
  const laporanQ = useApi(`/api/laporan?limit=500${status ? `&status=${status}` : ""}`);

  const q = cari.trim().toLowerCase();
  const cocok = (teks) =>
    !q || String(teks ?? "").toLowerCase().includes(q);

  const jurnal = (jurnalQ.data?.jurnal ?? []).filter(
    (j) => cocok(j.siswaNama) || cocok(j.judul) || cocok(j.siswaKelas)
  );
  const laporan = (laporanQ.data?.laporan ?? []).filter(
    (l) => cocok(l.siswaNama) || cocok(l.judul)
  );

  const aktif = tab === "jurnal" ? jurnalQ : laporanQ;

  return (
    <div>
      <PageHeader
        title="Tinjau Jurnal & Laporan"
        desc="Semua catatan siswa, termasuk yang sudah selesai."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {TAB.map((t) => (
          <Chip
            key={t.key}
            active={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setStatus("");
            }}
          >
            {t.label}
          </Chip>
        ))}
        <span className="ml-auto text-sm font-normal text-ink/60">
          {tab === "jurnal" ? `${jurnal.length} jurnal` : `${laporan.length} laporan`}
        </span>
      </div>

      <Panel className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Cari" hint="Nama siswa, kelas, atau judul.">
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="cth. Alya / kasir"
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {(tab === "jurnal" ? STATUS_JURNAL : STATUS_LAPORAN).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          {tab === "jurnal" ? (
            <Field label="Bulan" hint="Kosongkan untuk semua bulan.">
              <Input
                type="month"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>
      </Panel>

      {aktif.loading && !aktif.data ? (
        <LoadingBlock label="Memuat data tinjauan…" />
      ) : aktif.error ? (
        <Gagal error={aktif.error} onRetry={aktif.reload} />
      ) : tab === "jurnal" ? (
        jurnal.length === 0 ? (
          <EmptyState
            title="Tidak ada jurnal"
            desc="Ubah filter atau kata kunci pencarian."
          />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Siswa</Th>
                  <Th>Kegiatan</Th>
                  <Th>Status</Th>
                  <Th>Verifikator</Th>
                  <Th>Lampiran</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {jurnal.map((j) => (
                  <tr key={j.id} className={trCls}>
                    <Td>{formatTanggal(j.tanggal, true)}</Td>
                    <Td>
                      <span className="block font-medium">{j.siswaNama}</span>
                      <span className="text-xs text-ink/60">{j.siswaKelas}</span>
                    </Td>
                    <Td>
                      <span className="block font-medium">{j.judul}</span>
                      <span className="line-clamp-1 text-xs text-ink/60">
                        {j.kegiatan}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          j.status === "diterima"
                            ? "green"
                            : j.status === "ditolak"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {j.status.replaceAll("_", " ")}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="block text-xs">
                        {j.verifikasiDudiOleh || "-"}
                      </span>
                      <span className="block text-xs text-ink/60">
                        {j.verifikasiSekolahOleh || "-"}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <IconFile size={13} /> {j.lampiranList?.length ?? 0}
                      </span>
                    </Td>
                    <Td>
                      <Btn tone="white" size="sm" onClick={() => setJurnalId(j.id)}>
                        Tinjau
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )
      ) : laporan.length === 0 ? (
        <EmptyState
          title="Tidak ada laporan"
          desc="Ubah filter atau kata kunci pencarian."
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr>
                <Th>Judul</Th>
                <Th>Siswa</Th>
                <Th>Versi</Th>
                <Th>Status</Th>
                <Th>Nilai</Th>
                <Th>Diperbarui</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {laporan.map((l) => (
                <tr key={l.id} className={trCls}>
                  <Td>
                    <span className="block font-medium">{l.judul}</span>
                    <span className="text-xs text-ink/60">
                      {l.ukuran || "-"} · {l.halaman ?? "-"} halaman
                    </span>
                  </Td>
                  <Td>{l.siswaNama}</Td>
                  <Td>v{l.versi}</Td>
                  <Td>
                    <LaporanBadge status={l.status} />
                  </Td>
                  <Td>{l.nilaiAkhir != null ? `${l.nilaiAkhir} / 100` : "-"}</Td>
                  <Td>{l.diperbarui || "-"}</Td>
                  <Td>
                    <Btn tone="white" size="sm" onClick={() => setLaporanId(l.id)}>
                      Tinjau
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <p className="mt-4 flex items-center gap-2 text-sm font-normal text-ink/60">
        <IconSearch size={14} /> Data ditampilkan maksimal 500 baris terbaru
        sesuai filter.
      </p>

      <JurnalDetail id={jurnalId} onClose={() => setJurnalId(null)} />
      <LaporanDetail id={laporanId} onClose={() => setLaporanId(null)} />
    </div>
  );
}
