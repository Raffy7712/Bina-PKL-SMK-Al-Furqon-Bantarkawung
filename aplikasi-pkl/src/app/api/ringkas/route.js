import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ringkas, ringkasKosong } from "@/lib/stats";

export async function GET() {
  const { user, error } = await requireRole("admin", "sekolah", "dudi");
  if (error) return error;
  if (user.role === "dudi" && !user.dudi_id) {
    return NextResponse.json(ringkasKosong());
  }
  return NextResponse.json(await ringkas(user));
}
