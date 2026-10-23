
const BATAS_TIMEOUT_MS = 12000;

export function urlBot() {
  return (process.env.WA_BOT_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

export function tokenBot() {
  return process.env.WA_BOT_TOKEN ?? "";
}

export function normalkanNomor(nomor) {
  if (nomor == null) return null;
  const teks = String(nomor).trim();
  if (!/^\+?[0-9][0-9\s().-]{5,24}$/.test(teks)) return null;

  let digit = teks.replace(/\D/g, "");
  if (digit.startsWith("620")) digit = `62${digit.slice(3)}`;
  else if (digit.startsWith("0")) digit = `62${digit.slice(1)}`;
  else if (digit.startsWith("8")) digit = `62${digit}`;

  return /^[1-9]\d{7,14}$/.test(digit) ? digit : null;
}

export function bersihkanTelepon(nilai) {
  const teks = String(nilai ?? "").trim();
  if (!teks) return { ok: true, nilai: null };
  if (!/^\+?[0-9][0-9\s().-]{5,24}$/.test(teks) || !normalkanNomor(teks)) {
    return { ok: false, error: "Nomor WhatsApp tidak valid (contoh: 0812-3456-7890)." };
  }
  return { ok: true, nilai: teks };
}

function pesanGalat(kode, dariBot) {
  if (dariBot) return dariBot;
  switch (kode) {
    case 401:
      return "Token API bot tidak valid (cek WA_BOT_TOKEN).";
    case 422:
      return "Nomor tidak terdaftar di WhatsApp.";
    case 429:
      return "Batas kirim per menit bot tercapai, coba lagi sebentar.";
    case 502:
      return "Bot gagal mengirim pesan.";
    case 503:
      return "Bot WhatsApp belum terhubung.";
    case 504:
      return "Bot tidak merespons (waktu habis).";
    default:
      return `Pengiriman gagal (kode ${kode}).`;
  }
}

async function ambilJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function statusBot() {
  const dasar = { online: false, whatsapp: null, queueSize: null, rateRemaining: null, uptimeSeconds: null, url: urlBot(), tokenDiatur: tokenBot() !== "" };
  try {
    const res = await fetch(`${urlBot()}/health`, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    const data = await ambilJson(res);
    if (!res.ok || data?.status !== "ok") {
      return { ...dasar, error: data?.error ?? `Bot menjawab HTTP ${res.status}.` };
    }
    return {
      ...dasar,
      online: true,
      whatsapp: data.whatsapp ?? "unknown",
      queueSize: data.queueSize ?? null,
      rateRemaining: data.rateRemaining ?? null,
      uptimeSeconds: data.uptimeSeconds ?? null,
    };
  } catch {
    return { ...dasar, error: "Bot tidak dapat dihubungi. Pastikan bot berjalan di " + urlBot() + "." };
  }
}

export async function kirimWa({ nomor, pesan }) {
  const phone = normalkanNomor(nomor);
  if (!phone) {
    return { ok: false, kode: 0, error: "Nomor WhatsApp tidak valid.", nomor: null };
  }
  const message = String(pesan ?? "").trim();
  if (!message) {
    return { ok: false, kode: 0, error: "Pesan kosong.", nomor: phone };
  }
  if (!tokenBot()) {
    return { ok: false, kode: 0, error: "WA_BOT_TOKEN belum diatur.", nomor: phone };
  }

  try {
    const res = await fetch(`${urlBot()}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenBot()}`,
      },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(BATAS_TIMEOUT_MS),
      cache: "no-store",
    });
    const data = await ambilJson(res);
    if (!res.ok) {
      return {
        ok: false,
        kode: res.status,
        error: pesanGalat(res.status, data?.error),
        nomor: phone,
      };
    }
    return {
      ok: true,
      kode: 200,
      error: null,
      messageId: data?.messageId ?? null,
      verified: data?.verified ?? false,
      nomor: phone,
    };
  } catch {
    return {
      ok: false,
      kode: 0,
      error: "Bot tidak dapat dihubungi (jaringan/timeout).",
      nomor: phone,
    };
  }
}
