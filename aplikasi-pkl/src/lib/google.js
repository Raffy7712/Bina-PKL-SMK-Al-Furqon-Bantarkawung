import { randomBytes } from "node:crypto";
import { one } from "./db";

const OTORISASI =
  process.env.GOOGLE_OAUTH_AUTHORIZE_URL ??
  "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN =
  process.env.GOOGLE_OAUTH_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
const USERINFO =
  process.env.GOOGLE_OAUTH_USERINFO_URL ??
  "https://openidconnect.googleapis.com/v1/userinfo";

export const COOKIE_OAUTH = "pkl_oauth";

export function clientIdGoogle() {
  return (process.env.GOOGLE_CLIENT_ID ?? "").trim();
}

export function clientSecretGoogle() {
  return (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
}

export function googleAktif() {
  return Boolean(clientIdGoogle() && clientSecretGoogle());
}

export function hostOtorisasi() {
  try {
    return new URL(OTORISASI).host;
  } catch {
    return null;
  }
}

export function redirectUri(origin) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/auth/google/callback`;
}

export function asalPublik(request, url) {
  const host = (request.headers.get("x-forwarded-host") ?? "")
    .split(",")[0]
    .trim();
  if (!host) return url.origin;
  const proto =
    (request.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim() ||
    url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

const K_ID = "google_client_id";
const K_SECRET = "google_client_secret";
const K_REDIRECT = "google_redirect_uri";

async function bacaKunci(kunci) {
  try {
    return (await one("SELECT nilai FROM pengaturan WHERE kunci = ?", [kunci]))?.nilai ?? null;
  } catch {
    return null;
  }
}

export async function kredensialGoogle() {
  const id = clientIdGoogle() || (await bacaKunci(K_ID)) || "";
  const secret = clientSecretGoogle() || (await bacaKunci(K_SECRET)) || "";
  const kembali = process.env.GOOGLE_REDIRECT_URI || (await bacaKunci(K_REDIRECT)) || "";
  return { clientId: id, clientSecret: secret, redirectUri: kembali };
}

export async function googleSiap() {
  const k = await kredensialGoogle();
  return Boolean(k.clientId && k.clientSecret);
}

export function stateBaru() {
  return randomBytes(24).toString("base64url");
}

export function urlOtorisasi({ redirectUri: kembali, state, clientId }) {
  const q = new URLSearchParams({
    client_id: clientId || clientIdGoogle(),
    redirect_uri: kembali,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${OTORISASI}?${q}`;
}

export function pathAman(nilai, cadangan = null) {
  const teks = String(nilai ?? "");
  return teks.startsWith("/") && !teks.startsWith("//") && !teks.includes("://")
    ? teks
    : cadangan;
}

async function mintaJson(url, init, apa) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    throw new Error(`Tidak bisa menghubungi Google (${apa}): ${e.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        `Google menolak ${apa} (${res.status})`
    );
  }
  return data;
}

export async function tukarKode({
  code,
  redirectUri: kembali,
  clientId,
  clientSecret,
}) {
  return mintaJson(
    TOKEN,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || clientIdGoogle(),
        client_secret: clientSecret || clientSecretGoogle(),
        redirect_uri: kembali,
        grant_type: "authorization_code",
      }),
    },
    "penukaran kode"
  );
}

export async function profilGoogle(accessToken) {
  return mintaJson(
    USERINFO,
    { headers: { authorization: `Bearer ${accessToken}` } },
    "pengambilan profil"
  );
}
