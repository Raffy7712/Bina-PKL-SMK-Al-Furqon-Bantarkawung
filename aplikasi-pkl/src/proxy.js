import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

const PREFIX = {
  siswa: "/siswa",
  dudi: "/pembimbing-dudi",
  sekolah: "/pembimbing-sekolah",
  admin: "/admin",
};

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("pkl_session")?.value;
  const session = verifySessionToken(token);

  if (pathname === "/akun" || pathname.startsWith("/akun/")) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const seg = pathname.split("/")[1];
  const peran = Object.entries(PREFIX).find(
    ([, prefix]) =>
      seg === prefix.slice(1) && (pathname === prefix || pathname.startsWith(prefix + "/"))
  );

  if (!peran) return NextResponse.next();

  const [role] = peran;

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session.role !== role) {
    return NextResponse.redirect(new URL(PREFIX[session.role] ?? "/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/siswa/:path*",
    "/pembimbing-dudi/:path*",
    "/pembimbing-sekolah/:path*",
    "/admin/:path*",
    "/akun/:path*",
  ],
};
