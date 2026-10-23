import { NextResponse } from "next/server";
import { one, run } from "@/lib/db";
import { getSession, setSessionCookie } from "@/lib/session";
import { publicUser, userExtra } from "@/lib/auth";
import {
  COOKIE_OAUTH,
  asalPublik,
  kredensialGoogle,
  profilGoogle,
  redirectUri,
  tukarKode,
} from "@/lib/google";

export async function GET(request) {
  const url = new URL(request.url);

  const balik = (path, hapusCookie = true) => {
    const res = new NextResponse(null, {
      status: 307,
      headers: { location: path },
    });
    if (hapusCookie) {
      res.cookies.set(COOKIE_OAUTH, "", { path: "/", maxAge: 0 });
    }
    return res;
  };

  const kredensial = await kredensialGoogle();
  if (!kredensial.clientId || !kredensial.clientSecret) {
    return balik("/login?google_error=belum_diatur");
  }

  let isi = null;
  try {
    isi = JSON.parse(
      Buffer.from(String(request.cookies.get(COOKIE_OAUTH)?.value ?? ""), "base64url").toString()
    );
  } catch {
    isi = null;
  }

  const galat = (kode) =>
    balik(isi?.mode === "tautkan" ? `/akun?google_error=${kode}` : `/login?google_error=${kode}`);

  const state = url.searchParams.get("state");
  if (!isi?.state || !state || isi.state !== state) return galat("kedaluwarsa");

  if (url.searchParams.get("error")) return galat("dibatalkan");

  const kode = url.searchParams.get("code");
  if (!kode) return galat("gagal");

  let profil = null;
  try {
    const token = await tukarKode({
      code: kode,
      redirectUri: kredensial.redirectUri || redirectUri(asalPublik(request, url)),
      clientId: kredensial.clientId,
      clientSecret: kredensial.clientSecret,
    });
    profil = await profilGoogle(token.access_token);
  } catch (e) {
    console.error("[google] gagal:", e?.message ?? e);
    return galat("gagal");
  }
  if (!profil?.sub || !profil?.email) return galat("gagal");
  if (profil.email_verified === false) return galat("email_tidak_terverifikasi");

  const sub = String(profil.sub);
  const emailGoogle = String(profil.email).trim().toLowerCase();

  if (isi.mode === "tautkan") {
    const session = await getSession();
    if (!session || (isi.uid && isi.uid !== session.uid)) return galat("sesi");

    const dipakai = await one("SELECT id, nama FROM users WHERE google_sub = ? AND id <> ?", [
      sub,
      session.uid,
    ]);
    if (dipakai) return galat("sudah_dipakai");

    await run("UPDATE users SET google_sub = ?, google_email = ? WHERE id = ?", [
      sub,
      emailGoogle,
      session.uid,
    ]);
    return balik("/akun?google=ok");
  }

  const user = await one("SELECT * FROM users WHERE google_sub = ?", [sub]);
  if (!user) return galat("belum_taut");

  await setSessionCookie(user);
  const pub = publicUser(user, await userExtra(user.id));
  return balik(isi.next ?? pub.href, false);
}
