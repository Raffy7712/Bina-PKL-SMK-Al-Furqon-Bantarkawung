import { NextResponse, connection } from "next/server";
import { googleSiap, hostOtorisasi } from "@/lib/google";

export async function GET() {
  await connection();
  const aktif = await googleSiap();
  return NextResponse.json({ aktif, host: aktif ? hostOtorisasi() : null });
}
