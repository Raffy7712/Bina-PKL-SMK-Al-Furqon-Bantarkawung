import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  COOKIE_OAUTH,
  asalPublik,
  kredensialGoogle,
  pathAman,
  redirectUri,
  stateBaru,
  urlOtorisasi,
} from "@/lib/google";

export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "tautkan" ? "tautkan" : "masuk";
  const next = pathAman(
    url.searchParams.get("next"),
    mode === "tautkan" ? "/akun" : null
  );

  const kembali = (path) =>
    new NextResponse(null, { status: 307, headers: { location: path } });

  const kredensial = await kredensialGoogle();
  if (!kredensial.clientId || !kredensial.clientSecret) {
    return kembali("/login?google_error=belum_diatur");
  }

  const session = await getSession();
  if (mode === "tautkan" && !session) {
    return kembali("/login?google_error=sesi&next=%2Fakun");
  }

  const state = stateBaru();
  const isi = Buffer.from(
    JSON.stringify({ state, mode, next, uid: session?.uid ?? null })
  ).toString("base64url");

  const res = NextResponse.redirect(
    urlOtorisasi({
      redirectUri: kredensial.redirectUri || redirectUri(asalPublik(request, url)),
      state,
      clientId: kredensial.clientId,
    })
  );
  res.cookies.set(COOKIE_OAUTH, isi, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 600,
  });
  return res;
}
