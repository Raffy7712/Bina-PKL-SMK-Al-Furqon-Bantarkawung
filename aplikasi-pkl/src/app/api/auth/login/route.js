import { NextResponse } from "next/server";
import { login, publicUser, userExtra } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import {
  catatBerhasil,
  catatGagal,
  sapuKedaluwarsa,
  sisaTunggu,
} from "@/lib/batas-login";

function ipKlien(request) {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "lokal"
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const ip = ipKlien(request);
  const identitas = String(body?.identifier ?? "").trim().toLowerCase().slice(0, 100);

  sapuKedaluwarsa();
  const tunggu = sisaTunggu(ip, identitas);
  if (tunggu > 0) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.ceil(tunggu / 60)} menit.`,
      },
      { status: 429, headers: { "retry-after": String(tunggu) } }
    );
  }

  const user = await login(body.identifier, body.password);
  if (!user) {
    catatGagal(ip, identitas);
    return NextResponse.json(
      { error: "Identitas atau kata sandi salah" },
      { status: 401 }
    );
  }

  catatBerhasil(identitas);
  await setSessionCookie(user);
  const pub = publicUser(user, await userExtra(user.id));
  return NextResponse.json({ ok: true, user: pub, href: pub.href });
}
