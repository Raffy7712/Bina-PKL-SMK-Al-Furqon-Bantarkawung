import { createServer } from "node:http";
import mysql from "mysql2/promise";
import readXlsxFile from "read-excel-file/node";
import { DOMAIN_EMAIL } from "../src/lib/domain.js";

const B = process.env.E2E_BASE ?? "http://localhost:3199";
let lulus = 0;
let gagal = 0;

function cek(nama, kondisi, info = "") {
  if (kondisi) {
    lulus++;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal++;
    console.log(`  ✗ ${nama}${info ? ` — ${info}` : ""}`);
  }
}

const waTerkirim = [];
const waServer = createServer((req, res) => {
  const jawab = (kode, data) => {
    res.writeHead(kode, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.method === "GET" && req.url === "/health") {
    jawab(200, {
      status: "ok",
      whatsapp: "connected",
      queueSize: 0,
      rateRemaining: 30,
      uptimeSeconds: 4242,
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/notifications") {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      let body = {};
      try {
        body = JSON.parse(data);
      } catch {
      }
      waTerkirim.push({
        phone: body.phone ?? null,
        message: body.message ?? "",
        auth: req.headers.authorization ?? null,
      });
      jawab(200, { success: true, messageId: `uji-${waTerkirim.length}`, verified: true });
    });
    return;
  }
  jawab(404, { error: "Endpoint tidak ditemukan." });
});
await new Promise((resolve) => waServer.listen(3198, "127.0.0.1", resolve));

globalThis._googleProfil = {};
const idpServer = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3197");
  const jawab = (kode, data) => {
    res.writeHead(kode, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.method === "GET" && url.pathname === "/authorize") {
    const alih = new URL(url.searchParams.get("redirect_uri"));
    alih.searchParams.set("code", "uji-code");
    alih.searchParams.set("state", url.searchParams.get("state") ?? "");
    res.writeHead(302, { location: alih.toString() });
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/token") {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      jawab(200, { access_token: "tok-uji", token_type: "Bearer", expires_in: 3600 });
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/userinfo") {
    if (req.headers.authorization !== "Bearer tok-uji") {
      jawab(401, { error: "token salah" });
      return;
    }
    jawab(200, globalThis._googleProfil);
    return;
  }
  jawab(404, { error: "Endpoint tiruan tidak dikenal." });
});
await new Promise((resolve) => idpServer.listen(3197, "127.0.0.1", resolve));

async function tungguWa(predikat, batasMs = 8000) {
  const mulai = Date.now();
  for (;;) {
    const hit = waTerkirim.find(predikat);
    if (hit) return hit;
    if (Date.now() - mulai > batasMs) return null;
    await new Promise((r) => setTimeout(r, 120));
  }
}

const setCk = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

async function req(path, { method = "GET", body, cookie, follow = false, headers = {} } = {}) {
  const r = await fetch(B + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: follow ? "follow" : "manual",
  });
  const teks = await r.text();
  let json = null;
  try {
    json = JSON.parse(teks);
  } catch {
  }
  return { status: r.status, json, teks, ck: setCk(r), lokasi: r.headers.get("location") };
}

async function login(identifier, password) {
  const r = await req("/api/auth/login", { method: "POST", body: { identifier, password } });
  return r;
}

const pad = (n) => String(n).padStart(2, "0");
const hariIni = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();
const bulanIni = hariIni.slice(0, 7);
const bulanDepan = (() => {
  const [y, m] = bulanIni.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
})();
const cap = Date.now().toString().slice(-6);
const [thnIni, blnIni] = bulanIni.split("-").map(Number);
const [thnDepan, blnDepan] = bulanDepan.split("-").map(Number);

const AKUN = {
  siswa: ["2401001", "siswa123"],
  dudi: ["bagas@nusantara.id", "dudi123"],
  sekolah: ["rina@its-raffy.my.id", "guru123"],
  admin: ["admin@its-raffy.my.id", "admin123"],
};

console.log("=== 1. Autentikasi & guard halaman ===");
{
  const salah = await login("2401001", "salah-banget");
  cek("login sandi salah → 401", salah.status === 401, `${salah.status}`);

  const me = await req("/api/auth/me");
  cek("/api/auth/me tanpa cookie → 401", me.status === 401, `${me.status}`);

  const ck = {};
  for (const [nama, [id, sandi]] of Object.entries(AKUN)) {
    const r = await login(id, sandi);
    cek(`login ${nama} → 200 + cookie`, r.status === 200 && r.ck.includes("pkl_session"), `${r.status}`);
    ck[nama] = r.ck;
  }
  globalThis._ck = ck;

  const infoBot = await req("/api/wa/status", { cookie: ck.admin });
  const botTiruan = String(infoBot.json?.url ?? "").includes("3198");
  cek("server uji memakai bot WA tiruan (:3198)", botTiruan, infoBot.json?.url ?? `${infoBot.status}`);
  if (!botTiruan) {
    console.error(
      "\nHENTI: WA_BOT_URL server uji bukan bot tiruan :3198.\n" +
        "Jalankan ulang server :3199 dengan: " +
        "WA_BOT_URL=http://127.0.0.1:3198 WA_BOT_TOKEN=uji-token\n" +
        "agar pengujian tidak mengirim WhatsApp sungguhan.\n"
    );
    process.exit(1);
  }

  const hal = await req("/");
  cek("landing / → 200", hal.status === 200, `${hal.status}`);
  const masuk = await req("/login");
  cek("halaman /login → 200", masuk.status === 200, `${masuk.status}`);

  const daftar = [
    ["siswa", ["/siswa", "/siswa/jurnal", "/siswa/laporan", "/siswa/absensi", "/siswa/lokasi"]],
    ["dudi", ["/pembimbing-dudi", "/pembimbing-dudi/siswa", "/pembimbing-dudi/verifikasi"]],
    ["sekolah", ["/pembimbing-sekolah", "/pembimbing-sekolah/verifikasi", "/pembimbing-sekolah/laporan"]],
    ["admin", ["/admin", "/admin/siswa", "/admin/kelas", "/admin/dudi", "/admin/sekolah", "/admin/notifikasi", "/admin/absensi"]],
  ];
  for (const [peran, halamans] of daftar) {
    for (const p of halamans) {
      const r = await req(p, { cookie: ck[peran] });
      cek(`halaman ${p} (${peran}) → 200`, r.status === 200, `${r.status}`);
    }
  }

  for (const peran of Object.keys(ck)) {
    const r = await req("/akun", { cookie: ck[peran] });
    cek(`halaman /akun (${peran}) → 200`, r.status === 200, `${r.status}`);
  }

  const guard1 = await req("/admin");
  const guard2 = await req("/admin", { cookie: ck.siswa });
  const guard3 = await req("/siswa", { cookie: ck.admin });
  const redirect = (r) => [302, 303, 307, 308].includes(r.status);
  cek(
    "guard: tanpa cookie → redirect login",
    redirect(guard1) && (guard1.lokasi ?? "").includes("login"),
    `${guard1.status} ${guard1.lokasi}`
  );
  cek("guard: siswa → /admin dialihkan", redirect(guard2), `${guard2.status} ${guard2.lokasi}`);
  cek("guard: admin → /siswa dialihkan", redirect(guard3), `${guard3.status} ${guard3.lokasi}`);

  const akunAnon = await req("/akun");
  cek(
    "guard: /akun tanpa cookie → redirect login",
    redirect(akunAnon) && (akunAnon.lokasi ?? "").includes("login"),
    `${akunAnon.status} ${akunAnon.lokasi}`
  );

  const keluar = await req("/api/auth/logout", { method: "POST", cookie: ck.siswa });
  const setCookie = keluar.ck;
  cek("logout → 200 + cookie dibersihkan", keluar.status === 200, `${keluar.status}`);
}

console.log("=== 2. Alur jurnal (siswa → DUDI → sekolah) ===");
{
  const ck = globalThis._ck;
  const judul1 = `E2E Verifikasi ${cap}`;
  const kosong = await req("/api/jurnal", { method: "POST", cookie: ck.siswa, body: { judul: "" } });
  cek("jurnal tanpa judul → 400", kosong.status === 400, `${kosong.status}`);
  const tanggalSalah = await req("/api/jurnal", {
    method: "POST",
    cookie: ck.siswa,
    body: { judul: "E2E X", tanggal: "18-10-2026" },
  });
  cek("jurnal tanggal salah format → 400", tanggalSalah.status === 400, `${tanggalSalah.status}`);

  const buat = await req("/api/jurnal", {
    method: "POST",
    cookie: ck.siswa,
    body: {
      judul: judul1,
      kegiatan: "Mengikuti alur E2E otomatis.",
      tanggal: hariIni,
      masuk: "08:00",
      keluar: "16:00",
    },
  });
  const jid = buat.json?.jurnal?.id;
  cek(
    "siswa kirim jurnal → 201 menunggu_dudi",
    buat.status === 201 && buat.json?.jurnal?.status === "menunggu_dudi",
    `${buat.status} ${buat.json?.jurnal?.status}`
  );

  const dudiLihat = await req(`/api/jurnal?siswaId=${buat.json?.jurnal?.siswaId}&limit=50`, {
    cookie: ck.dudi,
  });
  cek(
    "dudi melihat jurnal bimbingannya",
    (dudiLihat.json?.jurnal ?? []).some((j) => j.id === jid)
  );

  const sekolahDulu = await req(`/api/jurnal/${jid}/verify`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "terima" },
  });
  cek("sekolah verifikasi sebelum DUDI → 409", sekolahDulu.status === 409, `${sekolahDulu.status}`);

  const tolakKosong = await req(`/api/jurnal/${jid}/verify`, {
    method: "POST",
    cookie: ck.dudi,
    body: { aksi: "tolak" },
  });
  cek("DUDI tolak tanpa catatan → 400", tolakKosong.status === 400, `${tolakKosong.status}`);

  const tolak = await req(`/api/jurnal/${jid}/verify`, {
    method: "POST",
    cookie: ck.dudi,
    body: { aksi: "tolak", catatan: "Kegiatan belum jelas, mohon rinci." },
  });
  cek(
    "DUDI tolak + catatan → ditolak + jejak verifikator",
    tolak.status === 200 &&
      tolak.json?.jurnal?.status === "ditolak" &&
      tolak.json?.jurnal?.catatanDudi?.length > 0 &&
      tolak.json?.jurnal?.verifikasiDudiHasil === "tolak" &&
      tolak.json?.jurnal?.verifikasiDudiOleh === "Bagas Pratama" &&
      !!tolak.json?.jurnal?.verifikasiDudiAt,
    `${tolak.status} ${tolak.json?.jurnal?.status}`
  );

  const buat2 = await req("/api/jurnal", {
    method: "POST",
    cookie: ck.siswa,
    body: { judul: `${judul1} (revisi)`, kegiatan: "Perbaikan.", tanggal: hariIni, masuk: "08:10", keluar: "16:05" },
  });
  const jid2 = buat2.json?.jurnal?.id;
  const pesanDudi = "Jurnal rapi, pertahankan.";
  const terimaDudi = await req(`/api/jurnal/${jid2}/verify`, {
    method: "POST",
    cookie: ck.dudi,
    body: { aksi: "terima", catatan: pesanDudi },
  });
  cek(
    "DUDI terima → menunggu_sekolah + nama verifikator",
    terimaDudi.status === 200 &&
      terimaDudi.json?.jurnal?.status === "menunggu_sekolah" &&
      terimaDudi.json?.jurnal?.verifikasiDudiHasil === "terima" &&
      terimaDudi.json?.jurnal?.verifikasiDudiOleh === "Bagas Pratama" &&
      terimaDudi.json?.jurnal?.catatanDudi === pesanDudi,
    `${terimaDudi.json?.jurnal?.status}`
  );
  const terimaSekolah = await req(`/api/jurnal/${jid2}/verify`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "terima" },
  });
  cek(
    "sekolah terima → diterima + nama verifikator",
    terimaSekolah.status === 200 &&
      terimaSekolah.json?.jurnal?.status === "diterima" &&
      terimaSekolah.json?.jurnal?.verifikasiSekolahHasil === "terima" &&
      terimaSekolah.json?.jurnal?.verifikasiSekolahOleh === "Ibu Rina Wulandari, S.Kom" &&
      !!terimaSekolah.json?.jurnal?.verifikasiSekolahAt,
    `${terimaSekolah.json?.jurnal?.status}`
  );

  const feed = await req("/api/ringkas", { cookie: ck.admin });
  const aktivitas = feed.json?.aktivitas ?? [];
  cek(
    "aktivitas: jurnal baru + verifikasi DUDI/sekolah nyata di feed",
    aktivitas.some((a) => a.kategori === "jurnal" && a.detail.includes(judul1)) &&
      aktivitas.some((a) => a.kategori === "verifikasi-dudi" && a.detail.includes("(revisi)")) &&
      aktivitas.some((a) => a.kategori === "verifikasi-sekolah"),
    `n=${aktivitas.length}`
  );

  const adminCoba = await req("/api/jurnal", { method: "POST", cookie: ck.admin, body: { judul: "X", tanggal: hariIni } });
  cek("admin kirim jurnal → 403", adminCoba.status === 403, `${adminCoba.status}`);

  const filter = await req("/api/jurnal?status=menunggu_sekolah,diterima&limit=50", { cookie: ck.admin });
  cek(
    "filter status gabungan hanya 2 status itu",
    (filter.json?.jurnal ?? []).every((j) => ["menunggu_sekolah", "diterima"].includes(j.status))
  );

  const limit = await req("/api/jurnal?limit=1", { cookie: ck.admin });
  cek(
    "paginasi limit=1",
    (limit.json?.jurnal ?? []).length <= 1 && typeof limit.json?.total === "number",
    `rows=${(limit.json?.jurnal ?? []).length}`
  );

  const bulanan = await req(`/api/jurnal?bulan=${bulanIni}&limit=50`, { cookie: ck.admin });
  cek(
    "filter bulan: semua tanggal di bulan itu",
    (bulanan.json?.jurnal ?? []).every((j) => j.tanggal.startsWith(bulanIni))
  );
}

console.log("=== 3. Alur laporan (kirim → revisi → jawaban → terima) ===");
{
  const ck = globalThis._ck;
  const judul = `E2E Laporan ${cap}`;
  const buat = await req("/api/laporan", {
    method: "POST",
    cookie: ck.siswa,
    body: { judul, berkas: { nama: "e2e.pdf", ukuran: "2 MB" } },
  });
  const lid = buat.json?.laporan?.id;
  cek("siswa kirim laporan → terkirim", [200, 201].includes(buat.status) && buat.json?.laporan?.status === "terkirim", `${buat.status}`);

  const dudiLihat = await req("/api/laporan?limit=100", { cookie: ck.dudi });
  cek("dudi melihat laporan bimbingannya", (dudiLihat.json?.laporan ?? []).some((l) => l.id === lid));

  const siswaReview = await req(`/api/laporan/${lid}/review`, {
    method: "POST",
    cookie: ck.siswa,
    body: { aksi: "revisi", catatan: "X" },
  });
  cek("siswa review laporan sendiri → 403", siswaReview.status === 403, `${siswaReview.status}`);

  const revisi = await req(`/api/laporan/${lid}/review`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "revisi", catatan: "Bab 2 kurang data." },
  });
  cek(
    "sekolah minta revisi → status revisi + feedback",
    revisi.status === 200 && revisi.json?.laporan?.status === "revisi" && revisi.json?.laporan?.feedback?.includes("Bab 2"),
    `${revisi.status} ${revisi.json?.laporan?.status}`
  );

  const ulang = await req("/api/laporan", {
    method: "POST",
    cookie: ck.siswa,
    body: { judul, revisiDari: lid, jawaban: "Data sudah ditambahkan." },
  });
  cek("siswa kirim revisi + jawaban → ok", [200, 201].includes(ulang.status), `${ulang.status}`);

  const lihat = await req("/api/laporan?limit=200", { cookie: ck.sekolah });
  const row = (lihat.json?.laporan ?? []).find((l) => l.id === lid);
  cek(
    "versi naik + jawaban tersimpan",
    row?.versi === 2 && row?.jawaban === "Data sudah ditambahkan.",
    `v${row?.versi} jawaban=${row?.jawaban}`
  );

  const rubrikSetengah = await req(`/api/laporan/${lid}/review`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "terima", penilaian: { isi: 70 } },
  });
  cek("rubrik terisi sebagian → 400", rubrikSetengah.status === 400, `${rubrikSetengah.status}`);

  const terima = await req(`/api/laporan/${lid}/review`, {
    method: "POST",
    cookie: ck.sekolah,
    body: {
      aksi: "terima",
      catatan: "Siap dipresentasikan.",
      penilaian: { isi: 80, format: 90, analisis: 70, presentasi: 100 },
    },
  });
  cek(
    "sekolah terima laporan + rubrik → nilai akhir 85",
    terima.status === 200 &&
      terima.json?.laporan?.status === "diterima" &&
      terima.json?.laporan?.nilaiAkhir === 85 &&
      terima.json?.laporan?.penilaian?.presentasi === 100,
    `${terima.status} ${terima.json?.laporan?.nilaiAkhir}`
  );

  const detail = await req(`/api/laporan/${lid}`, { cookie: ck.siswa });
  const riwayat = detail.json?.riwayat ?? [];
  cek(
    "detail laporan: timeline kirim → revisi → revisi siswa → terima",
    detail.status === 200 &&
      riwayat.length === 4 &&
      riwayat[0].aksi === "kirim" &&
      riwayat[1].aksi === "revisi" &&
      riwayat[1].peran === "sekolah" &&
      riwayat[2].peran === "siswa" &&
      riwayat[2].versi === 2 &&
      riwayat[3].aksi === "terima" &&
      riwayat[3].oleh === "Ibu Rina Wulandari, S.Kom",
    JSON.stringify(riwayat.map((r) => `${r.aksi}:${r.peran}`))
  );

  const detailDudi = await req(`/api/laporan/${lid}`, { cookie: ck.dudi });
  cek(
    "detail laporan: DUDI pembimbing melihat nilai",
    detailDudi.status === 200 && detailDudi.json?.laporan?.nilaiAkhir === 85,
    `${detailDudi.status}`
  );

  const ckSiswaLain = (await login("2401002", "siswa123")).ck;
  const detailSiswaLain = await req(`/api/laporan/${lid}`, { cookie: ckSiswaLain });
  cek("detail laporan: siswa lain → 403", detailSiswaLain.status === 403, `${detailSiswaLain.status}`);
}

console.log("=== 4. Kehadiran: absensi, checkin, ringkas ===");
{
  const ck = globalThis._ck;
  const absensi = await req(`/api/absensi?tahun=${thnIni}&bulan=${blnIni}`, { cookie: ck.admin });
  cek(
    "absensi: matriks hadir berisi kunci siswa|tanggal",
    absensi.status === 200 &&
      Array.isArray(absensi.json?.hadir) &&
      absensi.json.hadir.every((k) => /^[^|]+\|\d{4}-\d{2}-\d{2}$/.test(k)),
    `${absensi.status} n=${absensi.json?.hadir?.length}`
  );
  const bulSalah = await req("/api/absensi?tahun=2026&bulan=13", { cookie: ck.admin });
  cek("absensi bulan 13 → 400", bulSalah.status === 400, `${bulSalah.status}`);
  const absensiDudi = await req(`/api/absensi?tahun=${thnIni}&bulan=${blnIni}`, { cookie: ck.dudi });
  cek("absensi sebagai dudi → 403", absensiDudi.status === 403, `${absensiDudi.status}`);

  const bersih = await req("/api/checkin", { method: "DELETE", cookie: ck.siswa });
  cek("checkin: bersihkan hari ini", bersih.status === 200, `${bersih.status}`);

  const mitra = await req("/api/dudi?mine=1", { cookie: ck.siswa });
  const titik = Array.isArray(mitra.json?.dudi) ? mitra.json.dudi[0] : mitra.json?.dudi;
  cek(
    "mitra punya titik & radius untuk geofence",
    titik?.lat != null && titik?.lng != null && titik?.radiusM > 0,
    JSON.stringify({ lat: titik?.lat, lng: titik?.lng, radius: titik?.radiusM })
  );

  const tanpaGps = await req("/api/checkin", { method: "POST", cookie: ck.siswa, body: {} });
  cek("checkin tanpa koordinat → 400", tanpaGps.status === 400, `${tanpaGps.status}`);

  const jauh = await req("/api/checkin", {
    method: "POST",
    cookie: ck.siswa,
    body: { lat: titik.lat + 0.05, lng: titik.lng + 0.05 },
  });
  cek(
    "checkin di luar radius → 422 + jarak",
    jauh.status === 422 && jauh.json?.jarak > jauh.json?.radius,
    `${jauh.status} jarak=${jauh.json?.jarak} radius=${jauh.json?.radius}`
  );

  const ci = await req("/api/checkin", {
    method: "POST",
    cookie: ck.siswa,
    body: { lat: titik.lat, lng: titik.lng, akurasi: 8 },
  });
  cek(
    "checkin di dalam radius → 201 + jarak/akurasi tercatat",
    ci.status === 201 &&
      ci.json?.checkin?.source === "gps" &&
      ci.json?.checkin?.jarak_m === 0 &&
      ci.json?.checkin?.akurasi_m === 8,
    `${ci.status} ${JSON.stringify(ci.json?.checkin ?? {})}`
  );
  const ciLagi = await req("/api/checkin", { method: "POST", cookie: ck.siswa, body: {} });
  cek("checkin dua kali → 409", ciLagi.status === 409, `${ciLagi.status}`);
  const riwayat = await req("/api/checkin", { cookie: ck.siswa });
  cek("riwayat checkin hari ini tampil", (riwayat.json?.checkin ?? []).length >= 1);
  const ciDudi = await req("/api/checkin", { cookie: ck.dudi });
  cek("checkin sebagai dudi → 403", ciDudi.status === 403, `${ciDudi.status}`);

  for (const peran of ["admin", "dudi", "sekolah"]) {
    const r = await req("/api/ringkas", { cookie: ck[peran] });
    const j = r.json ?? {};
    cek(
      `ringkas ${peran}: bentuk lengkap + persen wajar`,
      r.status === 200 &&
        typeof j.jurnal?.total === "number" &&
        typeof j.jurnal?.bulan?.diterima === "number" &&
        "periode" in (j.jurnal ?? {}) &&
        typeof j.laporan?.terkirim === "number" &&
        typeof j.kehadiran?.persen === "number" &&
        j.kehadiran.persen >= 0 &&
        j.kehadiran.persen <= 100 &&
        Array.isArray(j.terbaru) &&
        Array.isArray(j.aktivitas) &&
        j.aktivitas.every((a) => a.kategori && a.aksi && a.detail && a.waktu),
      `${r.status}`
    );
  }
  const ringkasSiswa = await req("/api/ringkas", { cookie: ck.siswa });
  cek("ringkas sebagai siswa → 403", ringkasSiswa.status === 403, `${ringkasSiswa.status}`);
}

console.log("=== 5. Batas bulan stats + scope data siswa ===");
{
  const ck = globalThis._ck;
  const semua = await req("/api/siswa?stats=1&tahun=2026&bulan=10", { cookie: ck.admin });
  const baris = (semua.json?.siswa ?? []).find((s) => s.nis === "2401001");
  const stats = semua.json?.stats?.[baris?.id];
  cek(
    "stats admin: mulai + bulan angka",
    typeof stats?.bulan === "number" && (stats?.mulai === null || typeof stats?.mulai === "string") && typeof stats?.jml === "number",
    JSON.stringify(stats)
  );

  const sebelumOkt = stats?.bulan ?? 0;
  const sebelumDepan =
    (await req(`/api/siswa?stats=1&tahun=${thnDepan}&bulan=${blnDepan}`, { cookie: ck.admin })).json?.stats?.[baris?.id]?.bulan ?? 0;

  const jNov = await req("/api/jurnal", {
    method: "POST",
    cookie: ck.siswa,
    body: { judul: `E2E Batas Bulan ${cap}`, kegiatan: "Uji batas bulan.", tanggal: `${bulanDepan}-01` },
  });
  cek("jurnal tanggal 1 bulan depan → 201", jNov.status === 201, `${jNov.status}`);

  const sesudahOkt = (await req("/api/siswa?stats=1&tahun=2026&bulan=10", { cookie: ck.admin })).json?.stats?.[baris?.id]?.bulan ?? 0;
  const sesudahDepan =
    (await req(`/api/siswa?stats=1&tahun=${thnDepan}&bulan=${blnDepan}`, { cookie: ck.admin })).json?.stats?.[baris?.id]?.bulan ?? 0;
  cek("stats Oktober tidak terpengaruh jurnal bulan depan", sesudahOkt === sebelumOkt, `${sebelumOkt} → ${sesudahOkt}`);
  cek("stats bulan depan naik 1", sesudahDepan === sebelumDepan + 1, `${sebelumDepan} → ${sesudahDepan}`);

  const ds = await req("/api/siswa", { cookie: ck.siswa });
  const dsRows = ds.json?.siswa ?? [];
  const dudiIdSiswa = baris?.dudiId ?? null;
  cek(
    "siswa: hanya teman se-mitra + tanda saya",
    dsRows.length >= 1 &&
      dsRows.some((s) => s.saya) &&
      (dudiIdSiswa ? dsRows.every((s) => s.dudiId === dudiIdSiswa) : dsRows.length === 1),
    `rows=${dsRows.length}`
  );

  const dd = await req("/api/siswa", { cookie: ck.dudi });
  const ddRows = dd.json?.siswa ?? [];
  const dudiBagas = ddRows[0]?.dudiId;
  cek(
    "dudi: hanya siswa bimbingan satu mitra",
    ddRows.length >= 1 && ddRows.every((s) => s.dudiId === dudiBagas && !s.saya)
  );
}

console.log("=== 6. Mitra DUDI + impor XLSX (API) ===");
{
  const ck = globalThis._ck;
  const daftar = await req("/api/dudi", { cookie: ck.admin });
  cek(
    "daftar mitra + jmlSiswa + jmlAkun",
    (daftar.json?.dudi ?? []).length >= 1 &&
      "jmlSiswa" in (daftar.json?.dudi?.[0] ?? {}) &&
      "jmlAkun" in (daftar.json?.dudi?.[0] ?? {}),
    "n=" + (daftar.json?.dudi ?? []).length
  );
  const namaMitra = daftar.json?.dudi?.[0]?.nama;

  const tambah = await req("/api/dudi", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: `E2E Mitra ${cap}`, bidang: "QA", alamat: "Jl. Uji", kota: "Bumiayu" },
  });
  cek("tambah mitra → ok", [200, 201].includes(tambah.status), `${tambah.status} ${tambah.teks.slice(0, 100)}`);
  const tanpaNama = await req("/api/dudi", { method: "POST", cookie: ck.admin, body: { bidang: "QA" } });
  cek("tambah mitra tanpa nama → 400", tanpaNama.status === 400, `${tanpaNama.status}`);

  const nisBaru = `E2E${cap}`;
  const impor = await req("/api/siswa/import", {
    method: "POST",
    cookie: ck.admin,
    body: {
      rows: [
        { nis: nisBaru, nama: "Siswa Impor E2E", kelas: "XII RPL 1", mitra: namaMitra },
        { nis: `${nisBaru}X`, nama: "Mitra Tak Dikenal", kelas: "XII RPL 1", mitra: "Mitra Tidak Ada" },
        { nis: `${nisBaru}Y`, nama: "Kelas Tak Dikenal", kelas: "XII Tidak Ada", mitra: namaMitra },
      ],
    },
  });
  const hasil = impor.json?.hasil ?? [];
  cek(
    "impor: 1 ok, 1 galat mitra, 1 galat kelas",
    [200, 201].includes(impor.status) &&
      hasil[0]?.status === "ok" &&
      hasil[1]?.status === "galat" &&
      /Mitra/.test(hasil[1]?.pesan ?? "") &&
      hasil[2]?.status === "galat" &&
      /Kelas/.test(hasil[2]?.pesan ?? ""),
    JSON.stringify(hasil.map((h) => h.status))
  );
  const cariBaru = await req("/api/siswa", { cookie: ck.admin });
  const siswaBaru = (cariBaru.json?.siswa ?? []).find((s) => s.nis === nisBaru);
  cek("siswa impor muncul di daftar", !!siswaBaru);
  if (siswaBaru) {
    const masukImpor = await login(nisBaru, nisBaru);
    cek("akun siswa impor bisa login (sandi = NIS)", masukImpor.status === 200, `${masukImpor.status}`);
    const hapus = await req(`/api/siswa/${siswaBaru.id}`, { method: "DELETE", cookie: ck.admin });
    cek("hapus siswa impor via DELETE", hapus.status === 200, `${hapus.status}`);
  }

  const mitraId = tambah.json?.dudi?.id;
  const ubahMitra = await req(`/api/dudi/${mitraId}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { nama: `E2E Mitra ${cap} Baru`, bidang: "QA 2", kota: "Purwokerto" },
  });
  cek(
    "ubah mitra → nama/kota berubah",
    ubahMitra.status === 200 &&
      ubahMitra.json?.dudi?.nama === `E2E Mitra ${cap} Baru` &&
      ubahMitra.json?.dudi?.kota === "Purwokerto",
    `${ubahMitra.status} ${ubahMitra.teks.slice(0, 120)}`
  );
  const ubahDudi = await req(`/api/dudi/${mitraId}`, {
    method: "PATCH",
    cookie: ck.dudi,
    body: { nama: "Bukan Haknya" },
  });
  cek("ubah mitra sebagai dudi → 403", ubahDudi.status === 403, `${ubahDudi.status}`);
  const ubahKosong = await req(`/api/dudi/${mitraId}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { nama: "   " },
  });
  cek("ubah mitra tanpa nama → 400", ubahKosong.status === 400, `${ubahKosong.status}`);

  const mitraBerisi = (daftar.json?.dudi ?? []).find((d) => d.jmlSiswa > 0);
  const hapusIsi = await req(`/api/dudi/${mitraBerisi.id}`, {
    method: "DELETE",
    cookie: ck.admin,
  });
  cek("hapus mitra berisi siswa → 409", hapusIsi.status === 409, `${hapusIsi.status}`);

  const hapusMitraE2e = await req(`/api/dudi/${mitraId}`, {
    method: "DELETE",
    cookie: ck.admin,
  });
  cek(
    "hapus mitra kosong → ok",
    hapusMitraE2e.status === 200,
    `${hapusMitraE2e.status} ${hapusMitraE2e.teks.slice(0, 120)}`
  );
  const mitraHilang = (await req("/api/dudi", { cookie: ck.admin })).json?.dudi?.find(
    (d) => d.id === mitraId
  );
  cek("mitra terhapus tidak muncul lagi", !mitraHilang);
  const hapusLagi = await req(`/api/dudi/${mitraId}`, {
    method: "DELETE",
    cookie: ck.admin,
  });
  cek("hapus mitra dua kali → 404", hapusLagi.status === 404, `${hapusLagi.status}`);

  const emailDudi = `e2e-dudi-${cap}@mitra.id`;
  const tambahAkun = await req("/api/dudi", {
    method: "POST",
    cookie: ck.admin,
    body: {
      nama: `E2E Mitra Akun ${cap}`,
      bidang: "QA",
      email: emailDudi,
      sandi: "dudiE2E123",
    },
  });
  const idMitraAkun = tambahAkun.json?.dudi?.id;
  cek(
    "tambah mitra + akun pembimbing sekaligus → 201",
    tambahAkun.status === 201 && tambahAkun.json?.dudi?.akun?.email === emailDudi,
    `${tambahAkun.status} ${tambahAkun.teks.slice(0, 100)}`
  );
  const masukDudiAkun = await login(emailDudi, "dudiE2E123");
  cek("akun pembimbing DUDI bisa login", masukDudiAkun.status === 200, `${masukDudiAkun.status}`);

  const emailDudi2 = `e2e-dudi-${cap}-2@mitra.id`;
  const gantiAkun = await req(`/api/dudi/${idMitraAkun}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { email: emailDudi2, sandi: "dudiE2E456" },
  });
  cek(
    "ubah email + sandi akun pembimbing DUDI",
    gantiAkun.status === 200 && gantiAkun.json?.dudi?.akun?.email === emailDudi2,
    `${gantiAkun.status}`
  );
  const masukDudiLama = await login(emailDudi, "dudiE2E123");
  cek("email/sandi lama akun dudi mati", masukDudiLama.status === 401, `${masukDudiLama.status}`);
  const masukDudiBaru = await login(emailDudi2, "dudiE2E456");
  cek("email + sandi baru akun dudi bisa login", masukDudiBaru.status === 200, `${masukDudiBaru.status}`);

  const sandiTanpaEmail = await req("/api/dudi", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: `E2E Mitra X ${cap}`, sandi: "dudiE2E789" },
  });
  cek("sandi tanpa email akun → 400", sandiTanpaEmail.status === 400, `${sandiTanpaEmail.status}`);
  const sandiDudiPendek = await req(`/api/dudi/${idMitraAkun}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { sandi: "123" },
  });
  cek("sandi akun dudi < 6 karakter → 400", sandiDudiPendek.status === 400, `${sandiDudiPendek.status}`);
  const emailDudiDobel = await req(`/api/dudi/${idMitraAkun}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { email: "bagas@nusantara.id" },
  });
  cek("email akun dudi milik akun lain → 409", emailDudiDobel.status === 409, `${emailDudiDobel.status}`);

  const dudiNonAdmin = (await req("/api/dudi", { cookie: ck.siswa })).json?.dudi?.find(
    (d) => d.id === idMitraAkun
  );
  cek(
    "info akun dudi tidak muncul untuk non-admin",
    !!dudiNonAdmin && !("akun" in dudiNonAdmin),
    JSON.stringify(Object.keys(dudiNonAdmin ?? {})).slice(0, 120)
  );

  const hapusMitraAkun = await req(`/api/dudi/${idMitraAkun}`, {
    method: "DELETE",
    cookie: ck.admin,
  });
  cek("hapus mitra berakun → akun ikut terhapus", hapusMitraAkun.status === 200, `${hapusMitraAkun.status}`);
  const masukSetelahHapus = await login(emailDudi2, "dudiE2E456");
  cek("akun dudi terhapus tak bisa login", masukSetelahHapus.status === 401, `${masukSetelahHapus.status}`);
}

console.log("=== 7. Master kelas (admin) ===");
{
  const ck = globalThis._ck;

  const daftarKelas = await req("/api/kelas", { cookie: ck.admin });
  const kelasAwal = daftarKelas.json?.kelas ?? [];
  cek(
    "daftar kelas memuat kelas seed + jmlSiswa",
    daftarKelas.status === 200 &&
      kelasAwal.some((k) => k.nama === "XII RPL 1" && typeof k.jmlSiswa === "number"),
    JSON.stringify(kelasAwal.slice(0, 3))
  );
  const bacaSiswa = await req("/api/kelas", { cookie: ck.siswa });
  cek("semua peran boleh membaca daftar kelas", bacaSiswa.status === 200, `${bacaSiswa.status}`);

  const namaKelas = `XII E2E ${cap}`;
  const buat = await req("/api/kelas", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: namaKelas },
  });
  cek("tambah kelas → 201", buat.status === 201, `${buat.status} ${buat.teks.slice(0, 120)}`);
  const kid = buat.json?.kelas?.id;

  const ganda = await req("/api/kelas", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: namaKelas.toLowerCase() },
  });
  cek("kelas duplikat (beda besar-kecil) → 409", ganda.status === 409, `${ganda.status}`);
  const tanpaNama = await req("/api/kelas", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: "  " },
  });
  cek("kelas tanpa nama → 400", tanpaNama.status === 400, `${tanpaNama.status}`);
  const bukanAdmin = await req("/api/kelas", {
    method: "POST",
    cookie: ck.siswa,
    body: { nama: "XII Nakal" },
  });
  cek("tambah kelas sebagai siswa → 403", bukanAdmin.status === 403, `${bukanAdmin.status}`);

  const nisKelas = `E2EK${cap}`;
  const tolakSiswa = await req("/api/siswa", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: "Siswa Kelas Asing", nis: nisKelas, kelas: "XII Tidak Ada" },
  });
  cek("siswa dengan kelas tak terdaftar → 400", tolakSiswa.status === 400, `${tolakSiswa.status}`);

  const semuaSiswa = (await req("/api/siswa", { cookie: ck.admin })).json?.siswa ?? [];
  const siswaSatu = semuaSiswa.find((s) => s.nis === "2401002");
  const kelasAsal = siswaSatu?.kelas;
  const pakai = await req(`/api/siswa/${siswaSatu.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { kelas: namaKelas },
  });
  cek("pindahkan siswa ke kelas baru → ok", pakai.status === 200, `${pakai.status}`);

  const ubah = await req(`/api/kelas/${kid}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { nama: `${namaKelas} B` },
  });
  const siswaSetelah = (await req("/api/siswa", { cookie: ck.admin })).json?.siswa?.find(
    (s) => s.nis === "2401002"
  );
  cek(
    "ubah nama kelas → data siswa ikut berubah",
    ubah.status === 200 && ubah.json?.dipindah === 1 && siswaSetelah?.kelas === `${namaKelas} B`,
    `dipindah=${ubah.json?.dipindah} kelas=${siswaSetelah?.kelas}`
  );

  const hapusTerpakai = await req(`/api/kelas/${kid}`, { method: "DELETE", cookie: ck.admin });
  cek("hapus kelas terpakai → 409", hapusTerpakai.status === 409, `${hapusTerpakai.status}`);

  await req(`/api/siswa/${siswaSatu.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { kelas: kelasAsal },
  });
  const hapusKosong = await req(`/api/kelas/${kid}`, { method: "DELETE", cookie: ck.admin });
  cek(
    "hapus kelas kosong → ok",
    hapusKosong.status === 200,
    `${hapusKosong.status} ${hapusKosong.teks.slice(0, 120)}`
  );
}

console.log("=== 8. Notifikasi WhatsApp + template dinamis ===");
{
  const ck = globalThis._ck;
  const nomorSiswa = `08128${cap}01`;
  const nomorSiswa62 = `62${nomorSiswa.slice(1)}`;
  const nomorSiswa2 = `08129${cap}02`;
  const nomorSiswa262 = `62${nomorSiswa2.slice(1)}`;

  const status = await req("/api/wa/status", { cookie: ck.admin });
  cek(
    "admin lihat status bot → online + terhubung",
    status.status === 200 &&
      status.json?.online === true &&
      status.json?.whatsapp === "connected" &&
      status.json?.tokenDiatur === true,
    JSON.stringify(status.json).slice(0, 140)
  );
  const statusSiswa = await req("/api/wa/status", { cookie: ck.siswa });
  cek("status bot sebagai siswa → 403", statusSiswa.status === 403, `${statusSiswa.status}`);
  const logSiswa = await req("/api/notifikasi/log", { cookie: ck.siswa });
  cek("log WA sebagai siswa → 403", logSiswa.status === 403, `${logSiswa.status}`);

  const semua = (await req("/api/siswa", { cookie: ck.admin })).json?.siswa ?? [];
  const saya = semua.find((s) => s.nis === "2401001");
  const pasang = await req(`/api/siswa/${saya.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { telepon: nomorSiswa },
  });
  cek(
    "admin simpan nomor WA siswa",
    pasang.status === 200 && pasang.json?.siswa?.telepon === nomorSiswa,
    `${pasang.status} ${pasang.json?.siswa?.telepon}`
  );
  const telpSalah = await req(`/api/siswa/${saya.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { telepon: "abc-def" },
  });
  cek("nomor WA ngawur → 400", telpSalah.status === 400, `${telpSalah.status}`);

  const ds = await req("/api/siswa", { cookie: ck.siswa });
  cek(
    "nomor WA tidak bocor ke sesama siswa",
    (ds.json?.siswa ?? []).every((s) => !s.telepon),
    `rows=${(ds.json?.siswa ?? []).length}`
  );

  const judulJurnal = `E2E WA jurnal ${cap}`;
  const buatJ = await req("/api/jurnal", {
    method: "POST",
    cookie: ck.siswa,
    body: {
      judul: judulJurnal,
      kegiatan: "Uji notifikasi WhatsApp.",
      tanggal: hariIni,
      masuk: "08:00",
      keluar: "16:00",
    },
  });
  const jid = buatJ.json?.jurnal?.id;
  cek("jurnal uji WA dibuat", buatJ.status === 201, `${buatJ.status}`);

  const waDudi = await tungguWa(
    (m) => m.phone === "6281211004477" && m.message.includes(judulJurnal)
  );
  cek(
    "jurnal baru → WA ke kontak mitra (nomor dinormalkan)",
    !!waDudi && waDudi.auth === "Bearer uji-token",
    waDudi ? waDudi.phone : "tidak ada pesan"
  );

  const notifDudi = await req("/api/notifikasi", { cookie: ck.dudi });
  cek(
    "DUDI menerima notifikasi aplikasi jurnal baru",
    (notifDudi.json?.notifikasi ?? []).some(
      (n) => n.jenis === "jurnal" && n.pesan.includes(judulJurnal)
    ) && (notifDudi.json?.belumDibaca ?? 0) >= 1,
    `belumDibaca=${notifDudi.json?.belumDibaca}`
  );

  const terimaDudi = await req(`/api/jurnal/${jid}/verify`, {
    method: "POST",
    cookie: ck.dudi,
    body: { aksi: "terima" },
  });
  cek("DUDI terima jurnal uji WA", terimaDudi.status === 200, `${terimaDudi.status}`);

  const notifSekolah = await req("/api/notifikasi", { cookie: ck.sekolah });
  cek(
    "sekolah menerima notifikasi verifikasi akhir",
    (notifSekolah.json?.notifikasi ?? []).some(
      (n) => n.judul.includes("verifikasi akhir") && n.pesan.includes(judulJurnal)
    )
  );

  const terimaSekolah = await req(`/api/jurnal/${jid}/verify`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "terima" },
  });
  cek("sekolah terima jurnal uji WA", terimaSekolah.status === 200, `${terimaSekolah.status}`);
  const waSiswa = await tungguWa(
    (m) => m.phone === nomorSiswa62 && m.message.includes(judulJurnal) && m.message.includes("DITERIMA")
  );
  cek("hasil verifikasi → WA ke nomor siswa", !!waSiswa, waSiswa ? "ok" : "tidak ada pesan");

  const notifSaya = await req("/api/notifikasi", { cookie: ck.siswa });
  const notifTerima = (notifSaya.json?.notifikasi ?? []).find(
    (n) => n.pesan.includes(judulJurnal) && n.judul === "Jurnal diterima"
  );
  cek("siswa menerima notifikasi aplikasi (belum dibaca)", !!notifTerima && notifTerima.dibaca === false);
  const baca = await req("/api/notifikasi/baca", {
    method: "POST",
    cookie: ck.siswa,
    body: { semua: true },
  });
  cek(
    "tandai semua dibaca → belumDibaca 0",
    baca.status === 200 && baca.json?.belumDibaca === 0,
    `belumDibaca=${baca.json?.belumDibaca}`
  );

  const judulLap = `E2E WA laporan ${cap}`;
  await req("/api/laporan", { method: "POST", cookie: ck.siswa, body: { judul: judulLap } });
  const notifLap = await req("/api/notifikasi", { cookie: ck.sekolah });
  cek(
    "laporan baru → notifikasi sekolah",
    (notifLap.json?.notifikasi ?? []).some(
      (n) => n.jenis === "laporan" && n.pesan.includes(judulLap)
    )
  );
  const lap = ((await req("/api/laporan?limit=100", { cookie: ck.sekolah })).json?.laporan ?? []).find(
    (l) => l.judul === judulLap
  );
  const review = await req(`/api/laporan/${lap.id}/review`, {
    method: "POST",
    cookie: ck.sekolah,
    body: { aksi: "revisi", catatan: `Bab 2 kurang data ${cap}.` },
  });
  cek("sekolah minta revisi laporan uji WA", review.status === 200, `${review.status}`);
  const waLap = await tungguWa(
    (m) => m.phone === nomorSiswa62 && m.message.includes(judulLap) && m.message.includes("revisi")
  );
  cek("revisi laporan → WA ke siswa", !!waLap, waLap ? "ok" : "tidak ada pesan");

  const kirim1 = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ck.admin,
    body: { mode: "siswa", id: saya.id, pesan: `Halo {nama}, uji manual ${cap}.` },
  });
  cek(
    "admin kirim WA ke siswa → terkirim",
    kirim1.status === 200 &&
      kirim1.json?.terkirim === 1 &&
      kirim1.json?.hasil?.[0]?.status === "terkirim",
    JSON.stringify(kirim1.json).slice(0, 140)
  );
  const waManual = await tungguWa(
    (m) =>
      m.phone === nomorSiswa62 &&
      m.message.includes(`uji manual ${cap}`) &&
      m.message.includes("Alya")
  );
  cek("placeholder {nama} diganti + pesan sampai", !!waManual, waManual ? "ok" : "tidak ada pesan");

  const dudiList = (await req("/api/dudi", { cookie: ck.admin })).json?.dudi ?? [];
  const mitra6 = dudiList.find((d) => d.nama.includes("Apotek"));
  const kirim2 = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ck.admin,
    body: { mode: "dudi", id: mitra6.id, pesan: `Halo {nama}, uji mitra ${cap}.` },
  });
  cek(
    "admin kirim WA ke mitra → terkirim",
    kirim2.status === 200 && kirim2.json?.terkirim === 1,
    JSON.stringify(kirim2.json).slice(0, 140)
  );
  const waMitra = await tungguWa(
    (m) =>
      m.phone === "6281277889090" &&
      m.message.includes(`uji mitra ${cap}`) &&
      m.message.includes("Nadia")
  );
  cek("WA mitra sampai + nama pembimbing dipakai", !!waMitra, waMitra ? "ok" : "tidak ada pesan");

  const nisBaru = `E2EWA${cap}`;
  const siswaBaru = await req("/api/siswa", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: `Siswa Tanpa WA ${cap}`, nis: nisBaru, kelas: "" },
  });
  cek("siswa uji tanpa nomor dibuat", siswaBaru.status === 201, `${siswaBaru.status}`);
  const idBaru = siswaBaru.json?.siswa?.id;
  const kirim3 = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ck.admin,
    body: { mode: "siswa", id: idBaru, pesan: "Uji tanpa nomor." },
  });
  cek(
    "kirim ke siswa tanpa nomor → tanpaNomor 1",
    kirim3.status === 200 &&
      kirim3.json?.terkirim === 0 &&
      kirim3.json?.tanpaNomor === 1 &&
      kirim3.json?.hasil?.[0]?.status === "tanpa_nomor",
    JSON.stringify(kirim3.json).slice(0, 140)
  );
  const kirimSalah = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ck.admin,
    body: { mode: "ngawur" },
  });
  cek("mode kirim ngawur → 400", kirimSalah.status === 400, `${kirimSalah.status}`);

  const s2 = semua.find((s) => s.nis === "2401002");
  const pasang2 = await req(`/api/siswa/${s2.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { telepon: nomorSiswa2 },
  });
  cek("nomor WA siswa kedua disimpan", pasang2.status === 200, `${pasang2.status}`);
  const pengingat = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ck.admin,
    body: { mode: "pengingat-jurnal" },
  });
  cek(
    "pengingat massal → terkirim + tanpa nomor terhitung",
    pengingat.status === 200 &&
      pengingat.json?.terkirim >= 1 &&
      (pengingat.json?.tanpaNomor ?? 0) >= 1 &&
      pengingat.json?.dilewati === 0,
    JSON.stringify(pengingat.json).slice(0, 160)
  );
  const waPengingat = await tungguWa(
    (m) => m.phone === nomorSiswa262 && m.message.includes("jurnal harian")
  );
  cek("WA pengingat sampai ke siswa kedua", !!waPengingat, waPengingat ? "ok" : "tidak ada pesan");

  const ck2 = (await login("2401002", "siswa123")).ck;
  const notifS2 = await req("/api/notifikasi", { cookie: ck2 });
  cek(
    "siswa kedua menerima notifikasi aplikasi pengingat",
    (notifS2.json?.notifikasi ?? []).some((n) => n.jenis === "pengingat")
  );

  const log = await req("/api/notifikasi/log?limit=100", { cookie: ck.admin });
  const entriSiswa = (log.json?.notifikasi ?? []).find(
    (n) => n.waNomor === nomorSiswa62 && n.waStatus === "terkirim"
  );
  cek(
    "log WA admin memuat entri terkirim + tujuan",
    !!entriSiswa && entriSiswa.tujuan?.includes("Alya"),
    entriSiswa ? entriSiswa.tujuan : "tidak ditemukan"
  );

  const namaKelasBaru = `XII WA ${cap}`;
  const kelasBaru = await req("/api/kelas", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: namaKelasBaru },
  });
  cek("kelas uji template dibuat", kelasBaru.status === 201, `${kelasBaru.status}`);

  const tres = await fetch(`${B}/api/siswa/template`, { headers: { cookie: ck.admin } });
  const buf = Buffer.from(await tres.arrayBuffer());
  cek(
    "unduh template dinamis → 200 xlsx",
    tres.status === 200 &&
      (tres.headers.get("content-type") ?? "").includes("spreadsheetml") &&
      buf.length > 2000,
    `${tres.status} ${tres.headers.get("content-type")} ${buf.length}B`
  );
  const lembar = await readXlsxFile(buf);
  const template = lembar.find((l) => l.sheet === "Template") ?? lembar[0];
  const header = template?.data?.[3] ?? [];
  cek(
    "template: judul & header benar",
    template?.data?.[0]?.[0] === "TEMPLATE INPUT DATA SISWA" &&
      header.join("|") === "NO|NIS|NAMA|KELAS|MITRA",
    header.join("|")
  );
  const daftar = (lembar.find((l) => l.sheet === "Daftar") ?? { data: [] }).data;
  const kolomKelas = daftar.slice(1).map((r) => r[0]).filter(Boolean);
  cek(
    "template: dropdown kelas memuat kelas terbaru (dinamis)",
    kolomKelas.includes(namaKelasBaru),
    `${kolomKelas.length} kelas`
  );
  const kolomMitra = daftar.slice(1).map((r) => r[1]).filter(Boolean);
  cek(
    "template: dropdown mitra memuat data mitra",
    kolomMitra.some((m) => String(m).includes("Nusantara"))
  );
  const tplSiswa = await fetch(`${B}/api/siswa/template`, { headers: { cookie: ck.siswa } });
  cek("template sebagai siswa → 403", tplSiswa.status === 403, `${tplSiswa.status}`);

  await req(`/api/kelas/${kelasBaru.json?.kelas?.id}`, { method: "DELETE", cookie: ck.admin });
}

console.log("=== 9. Akun pembimbing sekolah, Google, & ubah sandi ===");
{
  const ck = globalThis._ck;

  const gstatus = await req("/api/auth/google/status");
  const googleAktif = gstatus.status === 200 && gstatus.json?.aktif === true;
  const idpTiruan = String(gstatus.json?.host ?? "").includes("127.0.0.1:3197");
  if (googleAktif && !idpTiruan) {
    console.error(
      "\nHENTI: server uji menunjuk endpoint Google asli " +
        `(${gstatus.json?.host}). Jalankan ulang :3199 dengan ` +
        "GOOGLE_OAUTH_AUTHORIZE_URL/TOKEN_URL/USERINFO_URL ke http://127.0.0.1:3197 " +
        "agar pengujian tidak menyentuh akun Google sungguhan.\n"
    );
    process.exit(1);
  }
  if (!googleAktif) {
    console.log("  ⚠ Google tidak aktif di server uji — uji Google dilewati.");
  }

  const daftarSekolah = await req("/api/sekolah", { cookie: ck.admin });
  const rina = (daftarSekolah.json?.sekolah ?? []).find(
    (a) => a.email === "rina@its-raffy.my.id"
  );
  cek(
    "admin lihat daftar akun pembimbing sekolah",
    daftarSekolah.status === 200 && !!rina,
    `${daftarSekolah.status}`
  );
  const sekolahSiswa = await req("/api/sekolah", { cookie: ck.siswa });
  cek("daftar akun sekolah sebagai siswa → 403", sekolahSiswa.status === 403, `${sekolahSiswa.status}`);

  const hapusSatu = await req(`/api/sekolah/${rina.id}`, {
    method: "DELETE",
    cookie: ck.admin,
  });
  cek(
    "hapus akun sekolah terakhir → 409 (dijaga)",
    hapusSatu.status === 409,
    `${hapusSatu.status}`
  );

  const emailGuru = `e2e-guru-${cap}@contoh.id`;
  const buatGuru = await req("/api/sekolah", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: `Guru E2E ${cap}`, email: emailGuru, sandi: "guru123456" },
  });
  const idGuru = buatGuru.json?.akun?.id;
  cek(
    "admin buat akun pembimbing sekolah",
    buatGuru.status === 201 && buatGuru.json?.akun?.email === emailGuru,
    `${buatGuru.status}`
  );

  const dobel = await req("/api/sekolah", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: "Duplikat", email: emailGuru, sandi: "guru123456" },
  });
  cek("email akun sekolah duplikat → 409", dobel.status === 409, `${dobel.status}`);

  const sandiPendekAkun = await req("/api/sekolah", {
    method: "POST",
    cookie: ck.admin,
    body: { nama: "Pendek", email: `e2e-pendek-${cap}@contoh.id`, sandi: "123" },
  });
  cek("sandi akun sekolah < 6 karakter → 400", sandiPendekAkun.status === 400, `${sandiPendekAkun.status}`);

  const masukGuru = await login(emailGuru, "guru123456");
  cek("guru E2E bisa masuk dengan akun baru", masukGuru.status === 200, `${masukGuru.status}`);

  const emailGuru2 = `e2e-guru-${cap}-2@contoh.id`;
  const ubahGuru = await req(`/api/sekolah/${idGuru}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { nama: `Guru E2E ${cap} Baru`, email: emailGuru2, sandi: "guru654321" },
  });
  cek(
    "admin ubah nama/email/sandi akun sekolah",
    ubahGuru.status === 200 && ubahGuru.json?.akun?.email === emailGuru2,
    `${ubahGuru.status}`
  );
  const masukLamaGuru = await login(emailGuru, "guru123456");
  cek("email lama guru tak bisa masuk", masukLamaGuru.status === 401, `${masukLamaGuru.status}`);
  const masukBaruGuru = await login(emailGuru2, "guru654321");
  cek("email + sandi baru guru bisa masuk", masukBaruGuru.status === 200, `${masukBaruGuru.status}`);

  const sandiLamaSalah = await req("/api/akun/sandi", {
    method: "POST",
    cookie: ck.siswa,
    body: { lama: "bukan-sandi", baru: "rahasia123" },
  });
  cek("ganti sandi: sandi lama salah → 400", sandiLamaSalah.status === 400, `${sandiLamaSalah.status}`);
  const sandiBaruPendek = await req("/api/akun/sandi", {
    method: "POST",
    cookie: ck.siswa,
    body: { lama: "siswa123", baru: "123" },
  });
  cek("ganti sandi: baru < 6 karakter → 400", sandiBaruPendek.status === 400, `${sandiBaruPendek.status}`);
  const sandiOk = await req("/api/akun/sandi", {
    method: "POST",
    cookie: ck.siswa,
    body: { lama: "siswa123", baru: "rahasia123" },
  });
  cek("siswa ganti sandi sendiri → 200", sandiOk.status === 200, `${sandiOk.status}`);
  const loginSandiLama = await login("2401001", "siswa123");
  cek("sandi lama sudah tidak berlaku", loginSandiLama.status === 401, `${loginSandiLama.status}`);
  const loginSandiBaru = await login("2401001", "rahasia123");
  cek("sandi baru berlaku", loginSandiBaru.status === 200, `${loginSandiBaru.status}`);
  const kembalikan = await req("/api/akun/sandi", {
    method: "POST",
    cookie: loginSandiBaru.ck,
    body: { lama: "rahasia123", baru: "siswa123" },
  });
  cek("sandi dikembalikan (uji aman diulang)", kembalikan.status === 200, `${kembalikan.status}`);

  if (googleAktif) {
    const profil = {
      sub: `gsub-${cap}`,
      email: `e2e-google-${cap}@contoh.id`,
      email_verified: true,
      name: "Siswa Google E2E",
    };
    globalThis._googleProfil = profil;

    const mulaiTaut = await req("/api/auth/google/mulai?mode=tautkan&next=%2Fakun", {
      cookie: ck.siswa,
    });
    const stateTaut = new URL(mulaiTaut.lokasi ?? "http://tidak-ada/").searchParams.get("state");
    cek(
      "mulai tautkan Google → redirect ke IdP + state",
      [302, 307].includes(mulaiTaut.status) &&
        (mulaiTaut.lokasi ?? "").startsWith("http://127.0.0.1:3197/authorize") &&
        !!stateTaut,
      `${mulaiTaut.status} ${mulaiTaut.lokasi}`
    );

    const callTaut = await req(`/api/auth/google/callback?code=uji-code&state=${stateTaut}`, {
      cookie: `${ck.siswa}; ${mulaiTaut.ck}`,
    });
    cek(
      "callback tautkan → /akun?google=ok",
      [302, 307].includes(callTaut.status) && (callTaut.lokasi ?? "").includes("/akun?google=ok"),
      `${callTaut.status} ${callTaut.lokasi}`
    );

    const akunTertaut = await req("/api/akun", { cookie: ck.siswa });
    cek(
      "akun siswa menampilkan Google tertaut",
      akunTertaut.json?.akun?.googleEmail === profil.email,
      `${akunTertaut.json?.akun?.googleEmail}`
    );

    const stateSalah = await req("/api/auth/google/callback?code=uji-code&state=salah", {
      cookie: `${ck.siswa}; ${mulaiTaut.ck}`,
    });
    cek(
      "callback state tidak cocok → kedaluwarsa",
      (stateSalah.lokasi ?? "").includes("google_error=kedaluwarsa"),
      `${stateSalah.status} ${stateSalah.lokasi}`
    );

    const lewatTunnel = {
      "x-forwarded-host": "pkl-alf.its-raffy.my.id",
      "x-forwarded-proto": "https",
    };
    const mulaiTunnel = await req("/api/auth/google/mulai", { headers: lewatTunnel });
    const kembaliTunnel = new URL(mulaiTunnel.lokasi ?? "http://tidak-ada/").searchParams.get(
      "redirect_uri"
    );
    cek(
      "redirect_uri Google tidak memakai host container (localhost:3000)",
      (kembaliTunnel ?? "").endsWith("/api/auth/google/callback") &&
        !(kembaliTunnel ?? "").includes("localhost:3000"),
      `${kembaliTunnel}`
    );

    const galatTunnel = await req("/api/auth/google/callback?code=uji-code&state=salah", {
      cookie: `${ck.siswa}; ${mulaiTaut.ck}`,
      headers: lewatTunnel,
    });
    cek(
      "callback di belakang tunnel → Location relatif (tanpa host container)",
      /^\/(login|akun)\?google_error=/.test(galatTunnel.lokasi ?? ""),
      `${galatTunnel.status} ${galatTunnel.lokasi}`
    );

    const mulaiMasuk = await req("/api/auth/google/mulai");
    const stateMasuk = new URL(mulaiMasuk.lokasi ?? "http://tidak-ada/").searchParams.get("state");
    const callMasuk = await req(`/api/auth/google/callback?code=uji-code&state=${stateMasuk}`, {
      cookie: mulaiMasuk.ck,
    });
    cek(
      "login Google → dasbor siswa + cookie sesi baru",
      [302, 307].includes(callMasuk.status) &&
        (callMasuk.lokasi ?? "").endsWith("/siswa") &&
        callMasuk.ck.includes("pkl_session"),
      `${callMasuk.status} ${callMasuk.lokasi}`
    );
    const meGoogle = await req("/api/auth/me", { cookie: callMasuk.ck });
    cek(
      "sesi hasil login Google = akun siswa 2401001",
      meGoogle.json?.user?.email === `2401001@${DOMAIN_EMAIL}`,
      `${meGoogle.json?.user?.email}`
    );

    const loginEmailGoogle = await login(profil.email, "siswa123");
    cek("login pakai email Google + sandi → 200", loginEmailGoogle.status === 200, `${loginEmailGoogle.status}`);

    const loginSiswa2 = await login("2401002", "siswa123");
    const mulaiSiswa2 = await req("/api/auth/google/mulai?mode=tautkan", {
      cookie: loginSiswa2.ck,
    });
    const stateSiswa2 = new URL(mulaiSiswa2.lokasi ?? "http://tidak-ada/").searchParams.get("state");
    const callSiswa2 = await req(`/api/auth/google/callback?code=uji-code&state=${stateSiswa2}`, {
      cookie: `${loginSiswa2.ck}; ${mulaiSiswa2.ck}`,
    });
    cek(
      "Google sama di akun lain → sudah_dipakai",
      (callSiswa2.lokasi ?? "").includes("google_error=sudah_dipakai"),
      `${callSiswa2.status} ${callSiswa2.lokasi}`
    );

    const putusOrang = await req("/api/akun/google-putus", {
      method: "POST",
      cookie: ck.siswa,
      body: { userId: "u-bukan-aku" },
    });
    cek("non-admin putuskan Google orang lain → 403", putusOrang.status === 403, `${putusOrang.status}`);

    const putusSendiri = await req("/api/akun/google-putus", {
      method: "POST",
      cookie: ck.siswa,
      body: {},
    });
    cek(
      "putus tautan Google sendiri berhasil",
      putusSendiri.status === 200 && putusSendiri.json?.dihapus === profil.email,
      `${putusSendiri.status}`
    );
    const akunPutus = await req("/api/akun", { cookie: ck.siswa });
    cek(
      "googleEmail kosong setelah diputus",
      akunPutus.json?.akun?.googleEmail === null,
      `${akunPutus.json?.akun?.googleEmail}`
    );

    const mulaiTaut2 = await req("/api/auth/google/mulai?mode=tautkan&next=%2Fakun", {
      cookie: ck.siswa,
    });
    const stateTaut2 = new URL(mulaiTaut2.lokasi ?? "http://tidak-ada/").searchParams.get("state");
    const callTaut2 = await req(
      `/api/auth/google/callback?code=uji-code&state=${stateTaut2}`,
      { cookie: `${ck.siswa}; ${mulaiTaut2.ck}` }
    );
    cek(
      "tautkan ulang Google (persiapan uji admin)",
      (callTaut2.lokasi ?? "").includes("/akun?google=ok"),
      `${callTaut2.status}`
    );
    const putusAdmin = await req("/api/akun/google-putus", {
      method: "POST",
      cookie: ck.admin,
      body: { userId: akunTertaut.json?.akun?.id },
    });
    cek(
      "admin memutus Google milik pengguna lain",
      putusAdmin.status === 200 && putusAdmin.json?.dihapus === profil.email,
      `${putusAdmin.status} ${putusAdmin.json?.dihapus}`
    );

    const mulaiTanpaTaut = await req("/api/auth/google/mulai");
    const stateTanpa = new URL(mulaiTanpaTaut.lokasi ?? "http://tidak-ada/").searchParams.get("state");
    const callTanpa = await req(`/api/auth/google/callback?code=uji-code&state=${stateTanpa}`, {
      cookie: mulaiTanpaTaut.ck,
    });
    cek(
      "login Google tanpa tautan → google_error=belum_taut",
      (callTanpa.lokasi ?? "").includes("google_error=belum_taut"),
      `${callTanpa.status} ${callTanpa.lokasi}`
    );
  }

  const hapusGuru = await req(`/api/sekolah/${idGuru}`, { method: "DELETE", cookie: ck.admin });
  cek("admin hapus akun guru uji", hapusGuru.status === 200, `${hapusGuru.status}`);
  const loginGuruHapus = await login(emailGuru2, "guru654321");
  cek("akun guru terhapus tak bisa masuk", loginGuruHapus.status === 401, `${loginGuruHapus.status}`);
}

console.log("=== 10. Pengingat otomatis harian (jam 10) ===");
{
  const ck = globalThis._ck;
  const dbUji = async (sql, params = []) => {
    const nama = process.env.DB_NAME ?? "pkl_test";
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST ?? "127.0.0.1",
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER ?? "pkl",
        password: process.env.DB_PASSWORD ?? "",
        database: nama,
      });
      await conn.execute(sql, params);
      await conn.end();
    } catch (e) {
      console.log(`  ⚠ akses DB uji gagal (${nama}): ${e.message}`);
    }
  };

  const guard = await req("/api/pengaturan/pengingat", { cookie: ck.siswa });
  cek("pengaturan pengingat sebagai siswa → 403", guard.status === 403, `${guard.status}`);

  await dbUji("DELETE FROM pengaturan WHERE kunci LIKE 'pengingat%'");

  const awal = await req("/api/pengaturan/pengingat", { cookie: ck.admin });
  cek(
    "pengaturan awal: aktif, jam 10, Senin–Jumat",
    awal.status === 200 &&
      awal.json?.pengaturan?.aktif === true &&
      awal.json?.pengaturan?.jam === 10 &&
      JSON.stringify(awal.json?.pengaturan?.hari) === "[1,2,3,4,5]",
    JSON.stringify(awal.json?.pengaturan)
  );

  const ubah = await req("/api/pengaturan/pengingat", {
    method: "PATCH",
    cookie: ck.admin,
    body: { aktif: false, jam: 9, hari: [1, 2, 3, 4, 5, 6] },
  });
  cek(
    "admin ubah jadwal (jam + hari) tersimpan",
    ubah.status === 200 && ubah.json?.pengaturan?.jam === 9 && ubah.json?.pengaturan?.hari?.includes(6),
    JSON.stringify(ubah.json?.pengaturan)
  );
  const jamSalah = await req("/api/pengaturan/pengingat", {
    method: "PATCH",
    cookie: ck.admin,
    body: { jam: 25 },
  });
  cek("jam 25 di luar rentang → 400", jamSalah.status === 400, `${jamSalah.status}`);
  const hariKosong = await req("/api/pengaturan/pengingat", {
    method: "PATCH",
    cookie: ck.admin,
    body: { hari: [] },
  });
  cek("daftar hari kosong → 400", hariKosong.status === 400, `${hariKosong.status}`);

  const semua = (await req("/api/siswa", { cookie: ck.admin })).json?.siswa ?? [];
  const siswa2 = semua.find((s) => s.nis === "2401002");
  const nomor2 = `08129${cap}02`;
  const nomor262 = `62${nomor2.slice(1)}`;
  await req(`/api/siswa/${siswa2.id}`, {
    method: "PATCH",
    cookie: ck.admin,
    body: { telepon: nomor2 },
  });
  await dbUji(
    "DELETE FROM jurnal WHERE tanggal = ? AND siswa_id = (SELECT id FROM siswa WHERE nis = '2401002')",
    [hariIni]
  );

  const log2 = await login("2401002", "siswa123");
  const sebelum = (await req("/api/notifikasi", { cookie: log2.ck })).json?.notifikasi ?? [];
  const teratasSebelum = sebelum[0]?.id ?? null;
  const jmlWaSebelum = waTerkirim.length;

  const jalan = await req("/api/pengaturan/pengingat", {
    method: "POST",
    cookie: ck.admin,
    body: { jalankan: true },
  });
  cek(
    "jalankan pengingat otomatis → dijalankan + ada penerima",
    jalan.status === 200 &&
      jalan.json?.hasil?.dijalankan === true &&
      (jalan.json?.hasil?.total ?? 0) >= 1,
    JSON.stringify(jalan.json?.hasil).slice(0, 160)
  );

  const terkirimOtomatis = (jalan.json?.hasil?.hasil ?? []).find(
    (h) => h.status === "terkirim" && h.nomor
  );
  const waPengingat = terkirimOtomatis
    ? await tungguWa(
        (m) =>
          waTerkirim.indexOf(m) >= jmlWaSebelum &&
          m.phone === `62${String(terkirimOtomatis.nomor).replace(/^0/, "").replace(/[^0-9]/g, "")}` &&
          m.message.includes("jurnal harian")
      )
    : null;
  cek(
    "pengingat otomatis benar-benar sampai ke bot WA",
    !!waPengingat,
    waPengingat ? waPengingat.phone : "tidak ada pesan baru"
  );

  const setelah = (await req("/api/notifikasi", { cookie: log2.ck })).json?.notifikasi ?? [];
  cek(
    "pengingat otomatis → notifikasi aplikasi siswa bertambah",
    setelah[0]?.jenis === "pengingat" && setelah[0]?.id !== teratasSebelum,
    `${teratasSebelum} → ${setelah[0]?.id ?? "-"} (${setelah[0]?.jenis ?? "-"})`
  );

  const ulang = await req("/api/pengaturan/pengingat", {
    method: "POST",
    cookie: ck.admin,
    body: { jalankan: true },
  });
  cek(
    "jalankan ulang di hari sama → sudah_dijalankan_hari_ini",
    ulang.json?.hasil?.dijalankan === false &&
      ulang.json?.hasil?.alasan === "sudah_dijalankan_hari_ini",
    JSON.stringify(ulang.json?.hasil)
  );

  const akhir = await req("/api/pengaturan/pengingat", { cookie: ck.admin });
  cek(
    "hasil terakhir tersimpan untuk panel admin",
    akhir.json?.terakhir?.tanggal === hariIni && (akhir.json?.terakhir?.terkirim ?? 0) >= 1,
    JSON.stringify(akhir.json?.terakhir?.tanggal)
  );
}

console.log(`\nHasil E2E: ${lulus} lulus, ${gagal} gagal`);
waServer.close();
idpServer.close();
process.exit(gagal ? 1 : 0);
