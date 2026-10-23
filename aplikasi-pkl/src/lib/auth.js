import { one, all, verifyPassword } from "./db";
import { getSession } from "./session";

const HASH_TIRUAN = `s2$${"0".repeat(32)}$${"0".repeat(128)}`;

export function publicUser(row, extra = {}) {
  const sub =
    row.role === "siswa"
      ? `NIS ${extra.nis ?? "-"} · ${extra.kelas ?? "-"}`
      : row.role === "dudi"
        ? extra.dudiNama ?? "-"
        : row.role === "sekolah"
          ? "Guru Pembimbing PKL"
          : "Administrator Sekolah";

  return {
    id: row.id,
    nama: row.nama,
    email: row.email,
    role: row.role,
    fotoUrl: row.foto ? `/api/akun/foto?v=${encodeURIComponent(row.foto)}` : null,
    sub,
    href:
      row.role === "siswa"
        ? "/siswa"
        : row.role === "dudi"
          ? "/pembimbing-dudi"
          : row.role === "sekolah"
            ? "/pembimbing-sekolah"
            : "/admin",
  };
}

export async function findUserForLogin(identifier) {
  const id = String(identifier || "").trim().toLowerCase();
  if (!id) return null;
  return (
    await one("SELECT * FROM users WHERE username IS NOT NULL AND lower(username) = ?", [id]) ??
    await one("SELECT * FROM users WHERE lower(email) = ?", [id]) ??
    await one(
      "SELECT * FROM users WHERE google_email IS NOT NULL AND lower(google_email) = ?",
      [id]
    ) ??
    await one(
      `SELECT u.* FROM users u JOIN siswa s ON s.id = u.siswa_id
       WHERE lower(s.nis) = ?`,
      [id]
    )
  );
}

export async function userExtra(userId) {
  const u = await one("SELECT * FROM users WHERE id = ?", [userId]);
  if (!u) return {};
  if (u.role === "siswa") {
    const s = await one("SELECT nis, kelas, dudi_id FROM siswa WHERE id = ?", [u.siswa_id]);
    return s ?? {};
  }
  if (u.role === "dudi") {
    const d = await one("SELECT nama FROM dudi WHERE id = ?", [u.dudi_id]);
    return { dudiNama: d?.nama };
  }
  return {};
}

export async function login(identifier, password) {
  const user = await findUserForLogin(identifier);
  const hash = user?.password ?? HASH_TIRUAN;
  const cocok = verifyPassword(String(password ?? ""), hash);
  if (!user || !cocok) return null;
  return user;
}

export async function currentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await one(
    "SELECT id, nama, email, username, foto, role, siswa_id, dudi_id FROM users WHERE id = ?",
    [session.uid]
  );
  return user ?? null;
}

export async function requireRole(...roles) {
  const user = await currentUser();
  if (!user) {
    return { user: null, error: Response.json({ error: "Belum masuk" }, { status: 401 }) };
  }
  if (roles.length && !roles.includes(user.role)) {
    return {
      user,
      error: Response.json({ error: "Tidak punya akses" }, { status: 403 }),
    };
  }
  return { user, error: null };
}

export { all, one };
