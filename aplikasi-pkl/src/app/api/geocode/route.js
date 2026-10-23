import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveLocation } from "@/lib/geocode";

export async function POST(request) {
  const { error } = await requireRole("admin", "siswa");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  try {
    const loc = await resolveLocation(body.q ?? body.url);
    return NextResponse.json({ lokasi: loc });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
}
