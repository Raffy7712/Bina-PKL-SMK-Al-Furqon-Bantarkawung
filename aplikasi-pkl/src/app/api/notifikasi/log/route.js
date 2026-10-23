import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { serializeNotifikasi } from "@/lib/serialize";

export async function GET(request) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(parseInt(params.get("limit"), 10) || 50, 1), 200);

  const rows = await all(
    `SELECT n.*, u.nama AS user_nama, u.role AS user_role
     FROM notifikasi n
     LEFT JOIN users u ON u.id = n.user_id
     WHERE n.wa_status IS NOT NULL
     ORDER BY n.dibuat DESC, n.seq DESC
     LIMIT ?`,
    [limit]
  );

  return NextResponse.json({ notifikasi: rows.map(serializeNotifikasi) });
}
