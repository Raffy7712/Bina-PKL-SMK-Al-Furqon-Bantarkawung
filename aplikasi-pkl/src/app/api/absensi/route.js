import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { absensiHadir } from "@/lib/stats";

export async function GET(request) {
  const { user, error } = await requireRole("admin", "sekolah");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const tahun = Number.parseInt(params.get("tahun"), 10);
  const bulan = Number.parseInt(params.get("bulan"), 10);
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
    return NextResponse.json({ error: "Parameter tahun tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
    return NextResponse.json({ error: "Parameter bulan tidak valid (1–12)" }, { status: 400 });
  }
  return NextResponse.json({ hadir: await absensiHadir(user, tahun, bulan) });
}
