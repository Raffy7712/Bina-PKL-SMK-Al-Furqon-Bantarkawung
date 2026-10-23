import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { statusBot } from "@/lib/wa";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;
  return NextResponse.json(await statusBot());
}
