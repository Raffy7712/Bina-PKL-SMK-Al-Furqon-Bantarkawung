import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "pkl_session";
const SESSION_DAYS = 7;

const CADANGAN_DEV = "pkl-dev-secret-ganti-di-produksi";

function rahasia() {
  const nilai = process.env.SESSION_SECRET ?? "";
  if (nilai.length >= 32) return nilai;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET belum diisi (minimal 32 karakter). Sesi tidak bisa ditandatangani."
    );
  }
  return nilai || CADANGAN_DEV;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payloadB64) {
  return createHmac("sha256", rahasia()).update(payloadB64).digest("base64url");
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function createSessionToken(user) {
  const payload = {
    uid: user.id,
    role: user.role,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let expected;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload?.uid || !payload?.role) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

async function permintaanHttps() {
  const paksa = process.env.SESSION_COOKIE_SECURE;
  if (paksa === "1") return true;
  if (paksa === "0") return false;
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim().toLowerCase() === "https";
  return false;
}

export async function setSessionCookie(user) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: await permintaanHttps(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
