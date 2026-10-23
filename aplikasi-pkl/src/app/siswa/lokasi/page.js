"use client";

import { useRef, useState } from "react";
import {
  Panel,
  Btn,
  Badge,
  Avatar,
  PageHeader,
  SectionTitle,
  EmptyState,
  Toast,
} from "@/components/ui";
import {
  IconPin,
  IconClock,
  IconUsers,
  IconBuilding,
  IconCheck,
  IconArrow,
} from "@/components/icons";
import { useApi, api } from "@/lib/api";
import PetaLeaflet, { jarakMeter } from "@/components/peta-leaflet";
import { AKURASI_MAKS_M } from "@/lib/jarak";
import { ROLE_META } from "@/lib/mock";

const MICRO = "text-[11px] font-medium text-ink/65";

function GagalMemuat({ pesan, onCoba }) {
  return (
    <div
      role="alert"
      className="rounded-brutal bg-cherry/30 p-4 sm:p-5"
    >
      <p className="font-display text-base leading-tight">
        Lokasi tempat PKL gagal dimuat
      </p>
      <p className="mt-1 text-sm font-semibold text-ink/75">{pesan}</p>
      <div className="mt-3">
        <Btn tone="ink" size="sm" onClick={onCoba}>
          Coba lagi
        </Btn>
      </div>
    </div>
  );
}

export default function LokasiPage() {
  const dudiQuery = useApi("/api/dudi?mine=1");
  const checkinQuery = useApi("/api/checkin");
  const siswaQuery = useApi("/api/siswa");

  const [posisi, setPosisi] = useState(null);
  const [akurasi, setAkurasi] = useState(null);
  const [gpsState, setGpsState] = useState("idle");
  const [pendingCheckin, setPendingCheckin] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const dudi = dudiQuery.data?.dudi ?? null;
  const checkin = (checkinQuery.data?.checkin ?? [])[0] ?? null;
  const teman = siswaQuery.data?.siswa ?? [];

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }

  function cobaLagi() {
    dudiQuery.reload();
    checkinQuery.reload();
    siswaQuery.reload();
  }

  async function kirimCheckIn(koordinat, akurasi) {
    setPendingCheckin(true);
    try {
      const res = await api("/api/checkin", {
        method: "POST",
        body: { ...koordinat, akurasi },
      });
      const jam = String(res.checkin.created_at ?? "").slice(11, 16);
      showToast(`Check-in tercatat pukul ${jam || "sekarang"}`);
      checkinQuery.reload();
    } catch (err) {
      showToast(err.message);
    } finally {
      setPendingCheckin(false);
    }
  }

  function checkInDenganGps() {
    if (!dudi) return;
    if (!("geolocation" in navigator)) {
      setGpsState("ditolak");
      showToast("Perangkat ini tidak mendukung GPS, check-in tidak bisa dilakukan");
      return;
    }
    setGpsState("mencari");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const koordinat = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        const akurasi = Math.round(pos.coords.accuracy ?? 0);
        setPosisi(koordinat);
        setAkurasi(akurasi);
        setGpsState("aktif");

        if (akurasi > AKURASI_MAKS_M) {
          showToast(
            `Akurasi GPS rendah (±${akurasi} m). Coba lagi di tempat terbuka.`
          );
          return;
        }
        const jarak =
          dudi.lat != null && dudi.lng != null
            ? jarakMeter(koordinat, { lat: dudi.lat, lng: dudi.lng })
            : null;
        if (jarak != null && jarak > radius) {
          showToast(
            `Kamu ${jarak} m dari ${dudi.nama}, di luar radius ${radius} m.`
          );
          return;
        }
        kirimCheckIn(koordinat, akurasi);
      },
      (err) => {
        setGpsState("ditolak");
        showToast(
          err?.code === 1
            ? "Izin lokasi ditolak. Aktifkan GPS untuk check-in."
            : "Lokasi tidak terbaca. Coba lagi di tempat terbuka."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function batalkanCheckIn() {
    try {
      await api("/api/checkin", { method: "DELETE" });
      setPosisi(null);
      showToast("Check-in hari ini dibatalkan");
      checkinQuery.reload();
    } catch (err) {
      showToast(err.message);
    }
  }

  const loading = dudiQuery.loading;
  const radius = Number(dudi?.radiusM) > 0 ? Number(dudi.radiusM) : 100;
  const jarak =
    posisi && dudi?.lat != null && dudi?.lng != null
      ? jarakMeter(posisi, { lat: dudi.lat, lng: dudi.lng })
      : null;
  const dalamRadius = jarak == null ? null : jarak <= radius;

  const markers = [];
  if (dudi?.lat != null) {
    markers.push({
      lat: dudi.lat,
      lng: dudi.lng,
      warna: "#02826d",
      label: `${dudi.nama}, ${dudi.alamat}`,
    });
  }
  if (posisi) {
    markers.push({ lat: posisi.lat, lng: posisi.lng, warna: "#ff6b6b", label: "Lokasi saya" });
  }

  const info = dudi
    ? [
        {
          label: "Alamat",
          value: dudi.alamat,
          sub: dudi.kota,
          tone: "bg-white",
          icon: <IconBuilding size={16} />,
        },
        {
          label: "Koordinat",
          value: dudi.koordinat || "Belum diatur",
          sub: "Titik pin lokasi praktik",
          tone: "bg-paper",
          icon: <IconPin size={16} />,
        },
        {
          label: "Jam Praktik",
          value: dudi.jam,
          sub: "Senin – Jumat",
          tone: "bg-sun",
          icon: <IconClock size={16} />,
        },
        {
          label: "Radius Check-in",
          value: `${radius} meter`,
          sub: "Di luar radius ini check-in ditolak",
          tone: "bg-white",
          icon: <IconPin size={16} />,
        },
        {
          label: "Telepon",
          value: dudi.kontak,
          sub: "Kontak kantor",
          tone: "bg-white",
          icon: <IconUsers size={16} />,
        },
        {
          label: "Pembimbing DUDI",
          value: dudi.pembimbing,
          sub: "Mentor lapanganmu",
          tone: "bg-mint",
          icon: <IconCheck size={16} />,
        },
        {
          label: "Jumlah Siswa",
          value: `${teman.length} orang`,
          sub: `Terdaftar di ${dudi.nama}`,
          tone: "bg-candy",
          icon: <IconUsers size={16} />,
        },
      ]
    : [];

  if (loading) {
    return <p className={MICRO}>Memuat lokasi tempat PKL…</p>;
  }

  if (dudiQuery.error) {
    return <GagalMemuat pesan={dudiQuery.error.message} onCoba={cobaLagi} />;
  }

  if (!dudi) {
    return (
      <EmptyState
        title="Tempat PKL belum diatur"
        desc="Akunmu belum terhubung ke mitra. Hubungi pembimbing sekolah."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Lokasi DUDI"
        desc={`Tempat praktikmu: ${dudi.nama}, ${dudi.bidang}.`}
        action={
          checkin ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="green">
                Hadir · {String(checkin.created_at ?? "").slice(11, 16)}
              </Badge>
              <Btn tone="white" onClick={batalkanCheckIn}>
                Batalkan check-in
              </Btn>
            </div>
          ) : (
            <Btn
              tone="ink"
              onClick={checkInDenganGps}
              disabled={gpsState === "mencari" || pendingCheckin}
            >
              <IconCheck size={16} />
              {gpsState === "mencari"
                ? "Mencari GPS…"
                : pendingCheckin
                  ? "Menyimpan…"
                  : "Check-In dengan GPS"}
            </Btn>
          )
        }
      />

      {}
      <PetaLeaflet
        center={
          posisi ?? (dudi.lat != null ? { lat: dudi.lat, lng: dudi.lng } : undefined)
        }
        zoom={posisi ? 17 : 15}
        height={360}
        markers={markers}
        lingkaran={
          dudi.lat != null && dudi.lng != null
            ? [{ lat: dudi.lat, lng: dudi.lng, radius, warna: "#02826d" }]
            : []
        }
        className="mb-4"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold shadow-brutal-sm">
          <IconPin size={13} /> {dudi.koordinat || "koordinat belum diatur"}
        </span>
        <a href={dudi.maps} target="_blank" rel="noopener noreferrer">
          <Btn tone="white" size="sm">
            <IconArrow size={14} /> Buka di Google Maps
          </Btn>
        </a>
      </div>

      {}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {info.map((c) => (
          <Panel key={c.label} tone={c.tone} className="p-4 sm:p-5">
            <p className={`flex items-center gap-1.5 ${MICRO}`}>
              {c.icon} {c.label}
            </p>
            <p className="font-display mt-1.5 text-base leading-tight">{c.value}</p>
            <p className="mt-1 text-xs font-semibold text-ink/65">{c.sub}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {}
        <Panel tone={checkin ? "bg-mint" : "bg-white"} className="p-4 sm:p-5">
          <SectionTitle
            right={
              checkin ? <Badge tone="green">Hadir</Badge> : <Badge tone="red">Belum</Badge>
            }
          >
            Check-In Hari Ini
          </SectionTitle>

          {checkin ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-brutal bg-white p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-brutal bg-mint shadow-brutal-sm">
                  <IconCheck size={20} />
                </span>
                <div>
                  <p className="font-display text-lg leading-none">
                    Check-in pukul {String(checkin.created_at ?? "").slice(11, 16)}
                  </p>
                  <p className={`mt-1 ${MICRO}`}>
                    GPS · {dudi.nama}
                    {checkin.jarak_m != null
                      ? ` · ${Math.round(checkin.jarak_m)} m dari titik PKL`
                      : ""}
                  </p>
                </div>
              </div>
              {checkin.lat != null ? (
                <p className={`rounded-brutal bg-white p-3 ${MICRO}`}>
                  <IconPin size={13} className="inline" /> {checkin.lat},{" "}
                  {checkin.lng}
                </p>
              ) : null}
              <p className="text-xs font-semibold text-ink/70">
                Kehadiran hari ini sudah tercatat. Batalkan dari tombol di atas
                bila keliru.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink/70">
                Tekan <b>Check-In dengan GPS</b> di atas, lokasimu dicatat
                dan dibandingkan dengan titik tempat PKL.
              </p>
              {gpsState === "ditolak" ? (
                <p className="mt-3 rounded-brutal bg-tang/40 p-3 text-xs font-semibold">
                  Izin lokasi ditolak. Check-in hanya bisa lewat GPS di dalam
                  radius {radius} m dari titik tempat PKL.
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-brutal bg-paper p-3">
                <span className={`flex items-center gap-1.5 ${MICRO}`}>
                  <IconClock size={13} /> Jam praktik {dudi.jam}
                </span>
                <span className={MICRO}>Radius {radius} m · GPS wajib aktif</span>
              </div>
            </div>
          )}

          {posisi && jarak != null ? (
            <p
              className={`mt-3 rounded-brutal p-3 ${MICRO} ${
                dalamRadius ? "bg-marine/15" : "bg-cherry/20"
              }`}
            >
              Jarakmu: {jarak} m · radius {radius} m
              {akurasi ? ` · akurasi ±${akurasi} m` : ""} ·{" "}
              {dalamRadius ? "di dalam radius" : "di luar radius"}
            </p>
          ) : null}
        </Panel>

        {}
        <Panel className="p-4 sm:p-5">
          <SectionTitle right={<Badge tone="blue">{teman.length} Siswa</Badge>}>
            Siswa Praktik di Sini
          </SectionTitle>
          {teman.length === 0 ? (
            <EmptyState
              title="Belum ada siswa di tempat ini"
              desc="Daftar siswa muncul setelah kamu terdaftar."
            />
          ) : (
            <ul className="grid gap-3">
              {teman.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-brutal bg-paper p-2.5 shadow-brutal-sm"
                >
                  <Avatar name={s.nama} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">{s.nama}</p>
                    <p className="text-[11px] font-semibold text-ink/65">
                      NIS {s.nis} · {s.kelas}
                    </p>
                  </div>
                  {s.saya ? (
                    <Badge tone="yellow">Kamu</Badge>
                  ) : (
                    <Badge tone="white">{ROLE_META.siswa.label}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
