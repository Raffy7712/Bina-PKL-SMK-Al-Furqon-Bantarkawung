import { createServer } from "node:http";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";
import PQueue from "p-queue";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import {
  createRateLimiter,
  hasValidToken,
  loadDotEnv,
  maskPhone,
  normalizePhone,
  readJsonBody,
  withTimeout,
} from "./lib.js";

loadDotEnv(fileURLToPath(new URL("./.env", import.meta.url)));

const logLevel = process.env.LOG_LEVEL ?? "info";
const allowedLogLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!allowedLogLevels.includes(logLevel)) {
  fail(`LOG_LEVEL harus salah satu dari: ${allowedLogLevels.join(", ")}.`);
}

const baileysLogLevel = process.env.BAILEYS_LOG_LEVEL ?? "error";

if (!allowedLogLevels.includes(baileysLogLevel)) {
  fail(`BAILEYS_LOG_LEVEL harus salah satu dari: ${allowedLogLevels.join(", ")}.`);
}

const logger = pino({
  level: logLevel,
  base: { app: "aplikasipkl-bot", pid: process.pid, hostname: hostname() },
});
const baileysLogger = logger.child({ module: "baileys" }, { level: baileysLogLevel });

const apiToken = process.env.API_TOKEN;
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const authDirectory = process.env.WHATSAPP_AUTH_DIR ?? "auth_info";
const rateLimitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30);
const sendTimeoutMs = Number(process.env.SEND_TIMEOUT_MS ?? 45_000);
const maxBodySize = 16 * 1024;

let pairingPhone = "";

if (!apiToken) {
  fail("API_TOKEN wajib diatur sebelum bot dijalankan.");
}

if (apiToken.length < 32) {
  fail(
    "API_TOKEN terlalu pendek; gunakan minimal 32 karakter, misalnya hasil `openssl rand -hex 32`.",
  );
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail("PORT harus berupa angka antara 1 dan 65535.");
}

if (!Number.isInteger(rateLimitPerMinute) || rateLimitPerMinute < 1) {
  fail("RATE_LIMIT_PER_MINUTE harus berupa angka bulat positif.");
}

if (!Number.isInteger(sendTimeoutMs) || sendTimeoutMs < 1000) {
  fail("SEND_TIMEOUT_MS harus berupa angka bulat minimal 1000 milidetik.");
}

if (process.env.WHATSAPP_PAIRING_PHONE) {
  const parsedPairingPhone = normalizePhone(process.env.WHATSAPP_PAIRING_PHONE);
  if (!parsedPairingPhone) {
    fail(
      "WHATSAPP_PAIRING_PHONE harus berupa nomor WhatsApp dengan kode negara, misalnya 6281234567890.",
    );
  }
  pairingPhone = parsedPairingPhone;
}

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

const rateLimiter = createRateLimiter({ perMinute: rateLimitPerMinute });

const sendQueue = new PQueue({ concurrency: 1 });

let sock;
let isWhatsAppConnected = false;
let isShuttingDown = false;
let reconnectTimer;
let reconnectAttempts = 0;

const reconnectBaseDelayMs = 3_000;
const reconnectMaxDelayMs = 60_000;
const reconnectJitterMs = 1_000;

function scheduleReconnect() {
  if (isShuttingDown || reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;
  const delayMs =
    Math.min(reconnectBaseDelayMs * 2 ** (reconnectAttempts - 1), reconnectMaxDelayMs) +
    Math.floor(Math.random() * reconnectJitterMs);

  logger.warn({ attempt: reconnectAttempts, delayMs }, "Menjadwalkan penghubungan ulang WhatsApp.");

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connectWhatsApp().catch((error) => {
      logger.error({ err: error }, "Gagal menghubungkan bot WhatsApp.");
      scheduleReconnect();
    });
  }, delayMs);
}

function printQr(qr, attempt) {
  process.stderr.write(
    `\nPindai QR (terbitan ke-${attempt}) melalui WhatsApp > Perangkat tertaut:\n`,
  );
  qrcode.generate(qr, { small: true }, (art) => {
    process.stderr.write(`${art}\n`);
  });
}

async function requestPairingCode(socket) {
  const pairingCode = await socket.requestPairingCode(pairingPhone);
  logger.warn(
    { phone: maskPhone(pairingPhone), pairingCode },
    "Kode sandingkan diterbitkan; buka WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.",
  );
}

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
  const socket = makeWASocket({ auth: state, logger: baileysLogger });
  sock = socket;

  let pairingCodeRequested = false;
  let qrCount = 0;

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCount += 1;
      if (pairingPhone) {
        if (!pairingCodeRequested) {
          pairingCodeRequested = true;
          requestPairingCode(socket).catch((error) => {
            pairingCodeRequested = false;
            logger.error(
              { err: error },
              "Gagal meminta kode sandingkan; akan dicoba lagi saat QR berikutnya muncul.",
            );
          });
        } else {
          logger.info(
            { qrAttempt: qrCount },
            "Menunggu kode sandingkan ditautkan di WhatsApp.",
          );
        }
      } else {
        printQr(qr, qrCount);
        logger.warn(
          { qrAttempt: qrCount, qr },
          "QR baru diterbitkan; menunggu dipindai.",
        );
      }
    }

    if (connection === "open") {
      isWhatsAppConnected = true;
      reconnectAttempts = 0;
      logger.info("Bot WhatsApp terhubung.");
    }

    if (connection === "close") {
      isWhatsAppConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        logger.error(
          "Sesi WhatsApp keluar. Hapus folder sesi auth hanya jika ingin menautkan ulang perangkat.",
        );
        return;
      }

      logger.warn({ statusCode }, "Koneksi WhatsApp terputus.");
      scheduleReconnect();
    }
  });
}

const server = createServer(async (request, response) => {
  const startedAt = Date.now();
  const path = new URL(request.url, "http://localhost").pathname;

  response.on("finish", () => {
    logger.debug(
      {
        method: request.method,
        path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "Permintaan HTTP selesai.",
    );
  });

  if (request.method === "GET" && path === "/health") {
    return sendJson(response, 200, {
      status: "ok",
      whatsapp: isWhatsAppConnected ? "connected" : "disconnected",
      queueSize: sendQueue.size,
      rateRemaining: rateLimiter.remaining,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  if (request.method !== "POST" || path !== "/api/notifications") {
    return sendJson(response, 404, { error: "Endpoint tidak ditemukan." });
  }

  if (!hasValidToken(request.headers.authorization, apiToken)) {
    return sendJson(response, 401, { error: "API token tidak valid." });
  }

  let payload;
  try {
    payload = await readJsonBody(request, { maxBodySize });
  } catch (error) {
    return sendJson(response, error.statusCode ?? 400, {
      error: error.message,
    });
  }

  const phone = normalizePhone(payload?.phone);
  if (!phone) {
    return sendJson(response, 400, {
      error: "phone harus berupa nomor WhatsApp dengan kode negara, misalnya 6281234567890.",
    });
  }

  if (
    typeof payload?.message !== "string" ||
    payload.message.trim().length === 0 ||
    payload.message.length > 4096
  ) {
    return sendJson(response, 400, {
      error: "message wajib diisi dan maksimal 4096 karakter.",
    });
  }

  const rateSlot = rateLimiter.acquire();
  if (!rateSlot.allowed) {
    return sendJson(
      response,
      429,
      {
        error: `Melebihi batas ${rateLimitPerMinute} notifikasi per menit. Coba lagi dalam ${rateSlot.retryAfterSeconds} detik.`,
      },
      { "retry-after": String(rateSlot.retryAfterSeconds) },
    );
  }

  if (!isWhatsAppConnected || !sock) {
    return sendJson(response, 503, {
      error: "Bot WhatsApp belum terhubung. Coba lagi nanti.",
    });
  }

  const jid = `${phone}@s.whatsapp.net`;

  let verified = false;
  try {
    const registration = await sock.onWhatsApp(jid);
    if (Array.isArray(registration)) {
      verified = registration[0]?.exists === true;
      if (!verified) {
        logger.info({ phone: maskPhone(phone) }, "Nomor tidak terdaftar di WhatsApp.");
        return sendJson(response, 422, {
          error: "Nomor tidak terdaftar di WhatsApp.",
        });
      }
    } else {
      logger.warn(
        { phone: maskPhone(phone) },
        "Pemeriksaan nomor WhatsApp tidak memberikan hasil; melanjutkan tanpa verifikasi.",
      );
    }
  } catch (error) {
    logger.warn(
      { err: error, phone: maskPhone(phone) },
      "Pemeriksaan nomor WhatsApp gagal; melanjutkan tanpa verifikasi.",
    );
  }

  const sendStartedAt = Date.now();
  let result;
  try {
    result = await sendQueue.add(() =>
      withTimeout(sock.sendMessage(jid, { text: payload.message }), sendTimeoutMs),
    );
  } catch (error) {
    const durationMs = Date.now() - sendStartedAt;
    const isTimeout = error?.statusCode === 504;
    logger.error(
      {
        err: error,
        phone: maskPhone(phone),
        verified,
        durationMs,
        queueSize: sendQueue.size,
      },
      isTimeout ? "Notifikasi melebihi batas waktu." : "Gagal mengirim notifikasi WhatsApp.",
    );
    return sendJson(
      response,
      isTimeout ? 504 : 502,
      isTimeout
        ? { error: "Notifikasi gagal dikirim karena melebihi batas waktu." }
        : { error: "Notifikasi gagal dikirim melalui WhatsApp." },
    );
  }

  logger.info(
    {
      phone: maskPhone(phone),
      messageId: result?.key?.id ?? null,
      verified,
      durationMs: Date.now() - sendStartedAt,
      queueSize: sendQueue.size,
    },
    "Notifikasi WhatsApp terkirim.",
  );
  return sendJson(response, 200, {
    success: true,
    messageId: result?.key?.id ?? null,
    verified,
  });
});

server.listen(port, host, () => {
  logger.info(
    { host, port, rateLimitPerMinute, sendTimeoutMs },
    "API notifikasi berjalan.",
  );
  connectWhatsApp().catch((error) => {
    logger.error({ err: error }, "Gagal menghubungkan bot WhatsApp.");
    scheduleReconnect();
  });
});

function shutDown(signal) {
  isShuttingDown = true;
  clearTimeout(reconnectTimer);
  sendQueue.pause();
  server.close();
  sock?.end(new Error("Server dihentikan."));
  logger.info({ signal: signal ?? null }, "Server dihentikan.");
}

process.once("SIGINT", shutDown);
process.once("SIGTERM", shutDown);
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Rejection tak tertangani.");
});

