import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { bangunTemplateSiswa } from "@/lib/xlsx-tulis";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  const kelas = (await all("SELECT nama FROM kelas ORDER BY nama")).map((k) => k.nama);
  const mitra = (await all("SELECT nama FROM dudi ORDER BY nama")).map((d) => d.nama);

  const berkas = bangunTemplateSiswa({ kelas, mitra });

  return new NextResponse(berkas, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-siswa.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
