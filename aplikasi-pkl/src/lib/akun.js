import { one } from "./db";

export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_SANDI = 6;

export const SEMUA_ROLE = ["siswa", "dudi", "sekolah", "admin"];

export function cekFormatEmail(email) {
  const e = String(email ?? "").trim();
  if (!e) return "Email wajib diisi.";
  if (!RE_EMAIL.test(e)) return "Format email tidak valid.";
  return null;
}

export async function pemakaiEmail(email, kecualiId = null) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return null;
  return (
    await one(
      `SELECT id, nama FROM users
       WHERE (lower(email) = ? OR (google_email IS NOT NULL AND lower(google_email) = ?))
         AND (? IS NULL OR id <> ?)`,
      [e, e, kecualiId, kecualiId]
    ) ?? null
  );
}

export const RE_USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const MIN_USERNAME = 3;
export const MAKS_USERNAME = 30;

export function cekFormatUsername(username) {
  const u = String(username ?? "").trim().toLowerCase();
  if (!u) return "Username wajib diisi.";
  if (u.length < MIN_USERNAME) {
    return `Username minimal ${MIN_USERNAME} karakter.`;
  }
  if (u.length > MAKS_USERNAME) {
    return `Username maksimal ${MAKS_USERNAME} karakter.`;
  }
  if (!RE_USERNAME.test(u)) {
    return "Username hanya boleh huruf kecil, angka, titik, garis bawah, atau strip, dan diawali huruf atau angka.";
  }
  return null;
}

export async function pemakaiUsername(username, kecualiId = null) {
  const u = String(username ?? "").trim().toLowerCase();
  if (!u) return null;
  return (
    (await one(
      `SELECT id, nama FROM users
       WHERE lower(username) = ?
         AND (? IS NULL OR id <> ?)`,
      [u, kecualiId, kecualiId]
    )) ?? null
  );
}

export async function bertabrakanDenganLoginLain(username, kecualiId = null) {
  const u = String(username ?? "").trim().toLowerCase();
  if (!u) return null;
  return (
    (await one(
      `SELECT u.id, u.nama FROM users u
       LEFT JOIN siswa s ON s.id = u.siswa_id
       WHERE (lower(u.email) = ?
              OR (u.google_email IS NOT NULL AND lower(u.google_email) = ?)
              OR (s.nis IS NOT NULL AND lower(s.nis) = ?))
         AND (? IS NULL OR u.id <> ?)
       LIMIT 1`,
      [u, u, u, kecualiId, kecualiId]
    )) ?? null
  );
}

export function cekSandi(sandi, { wajib = true } = {}) {
  const s = String(sandi ?? "");
  if (!s) return wajib ? "Kata sandi wajib diisi." : null;
  if (s.length < MIN_SANDI) return `Kata sandi minimal ${MIN_SANDI} karakter.`;
  return null;
}
