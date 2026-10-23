import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

export function hasValidToken(authorizationHeader, apiToken) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const providedToken = Buffer.from(authorizationHeader.slice(7));
  const expectedToken = Buffer.from(apiToken);
  return (
    providedToken.length === expectedToken.length &&
    timingSafeEqual(providedToken, expectedToken)
  );
}

export async function readJsonBody(request, { maxBodySize }) {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    const error = new Error("Content-Type harus application/json.");
    error.statusCode = 415;
    throw error;
  }

  const contentLength = Number(request.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > maxBodySize) {
    const error = new Error("Ukuran body maksimal 16 KB.");
    error.statusCode = 413;
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodySize) {
      const error = new Error("Ukuran body maksimal 16 KB.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Body harus berupa JSON yang valid.");
    error.statusCode = 400;
    throw error;
  }
}

export function normalizePhone(phone) {
  if (typeof phone !== "string" || !/^\+?[0-9][0-9\s().-]{6,20}$/.test(phone)) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 0) {
    return "";
  }

  const prefixLength = Math.min(4, Math.max(1, digits.length - 4));
  const suffix = digits.length >= 10 ? digits.slice(-4) : "";
  const starCount = Math.max(digits.length - prefixLength - suffix.length, 0);
  return `${digits.slice(0, prefixLength)}${"*".repeat(starCount)}${suffix}`;
}

export function createRateLimiter({
  perMinute,
  windowMs = 60_000,
  now = Date.now,
} = {}) {
  if (!Number.isInteger(perMinute) || perMinute < 1) {
    throw new Error("perMinute harus berupa angka bulat positif.");
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("windowMs harus berupa angka bulat positif.");
  }

  let windowStart = now();
  let count = 0;

  return {
    acquire() {
      const currentNow = now();
      if (currentNow - windowStart >= windowMs) {
        windowStart = currentNow;
        count = 0;
      }

      if (count >= perMinute) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - currentNow) / 1000)),
        };
      }

      count += 1;
      return { allowed: true };
    },

    get remaining() {
      return Math.max(0, perMinute - count);
    },
  };
}

export function withTimeout(promise, timeoutMs) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error("Pengiriman pesan melebihi batas waktu.");
      error.statusCode = 504;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export function parseDotEnv(content) {
  const result = {};
  for (const rawLine of String(content).split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }
  return result;
}

export function loadDotEnv(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const applied = [];
  for (const [key, value] of Object.entries(parseDotEnv(content))) {
    if (!(key in process.env)) {
      process.env[key] = value;
      applied.push(key);
    }
  }
  return applied;
}
