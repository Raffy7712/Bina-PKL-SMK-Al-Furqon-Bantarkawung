#!/usr/bin/env node
const B = process.env.BENCH_BASE || "http://localhost:3200";

const fmt = (n) => (n >= 1024 ? `${(n / 1024).toFixed(0)} KB` : `${n} B`);
const ms = (n) => `${n.toFixed(0)} ms`;

async function req(method, path, cookie, body) {
  const t0 = performance.now();
  const res = await fetch(B + path, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const buf = await res.arrayBuffer();
  const t1 = performance.now();
  return { res, bytes: buf.byteLength, t: t1 - t0, text: new TextDecoder().decode(buf) };
}

async function login(identifier, password) {
  const r = await req("POST", "/api/auth/login", null, { identifier, password });
  const cookie = (r.res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0]).join("; ");
  if (r.res.status !== 200) throw new Error(`login ${identifier}: ${r.res.status}`);
  return cookie;
}

async function api(label, cookie, path, rowCount) {
  let best = Infinity, bytes = 0, json = null, rows = "";
  for (let i = 0; i < 3; i++) {
    const r = await req("GET", path, cookie);
    if (r.t < best) best = r.t;
    bytes = r.bytes;
    const p0 = performance.now();
    json = JSON.parse(r.text);
    const p1 = performance.now();
    if (i === 0) {
      const key = Object.keys(json).find((k) => Array.isArray(json[k]));
      if (key) rows = `${json[key].length} baris`;
      else rows = Object.keys(json).join(",");
      if (rowCount) {
        const r0 = performance.now();
        rowCount(json);
        var rcT = performance.now() - r0;
      }
    }
    if (i === 2) var parseT = p1 - p0;
  }
  console.log(
    `${label.padEnd(46)} ${ms(best).padStart(9)}  ${fmt(bytes).padStart(9)}  parse ${ms(parseT).padStart(8)}  ${rows}${rcT !== undefined && rowCount ? `  hitung ${ms(rcT)}` : ""}`
  );
  return json;
}

async function page(label, cookie, path) {
  let best = Infinity, status = 0;
  for (let i = 0; i < 3; i++) {
    const r = await req("GET", path, cookie);
    status = r.res.status;
    if (r.t < best) best = r.t;
  }
  console.log(`${label.padEnd(46)} ${ms(best).padStart(9)}  ${"-".padStart(9)}  ${"-".padStart(8)}  HTTP ${status}`);
}

function simulasiAbsensi(json) {
  const jurnal = json.jurnal ?? [];
  const t0 = performance.now();
  const set = new Set(jurnal.filter((j) => j.status !== "ditolak").map((j) => `${j.siswaId}|${j.tanggal}`));
  for (let i = 1; i <= 200; i++) {
    jurnal.filter((j) => j.siswaId === `sx${i}`);
  }
  return performance.now() - t0;
}

let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(B + "/login");
    if (r.status === 200) { ready = true; break; }
  } catch { }
  await new Promise((r) => setTimeout(r, 1000));
}
if (!ready) { console.log("SERVER TIDAK SIAP"); process.exit(1); }

console.log(`=== bench ${B} ===`);
const a = await login("admin@its-raffy.my.id", "admin123");
const d = await login("bagas@nusantara.id", "dudi123");
const k = await login("rina@its-raffy.my.id", "guru123");

console.log("--- API (latensi terbaik dari 3) ---");
await api("admin GET /api/jurnal (tanpa filter)", a, "/api/jurnal", simulasiAbsensi);
await api("admin GET /api/jurnal?status=menunggu_dudi", a, "/api/jurnal?status=menunggu_dudi");
await api("admin GET /api/siswa", a, "/api/siswa");
await api("admin GET /api/laporan", a, "/api/laporan");
await api("dudi GET /api/jurnal (cakupan sendiri)", d, "/api/jurnal");
await api("dudi GET /api/jurnal?status=menunggu_dudi", d, "/api/jurnal?status=menunggu_dudi");
await api("sekolah GET /api/jurnal?status=menunggu_sekolah", k, "/api/jurnal?status=menunggu_sekolah");

console.log("--- API agregat & terbatas (dipakai halaman setelah rewiring) ---");
await api("admin GET /api/ringkas", a, "/api/ringkas");
await api("admin GET /api/absensi?tahun=2026&bulan=10", a, "/api/absensi?tahun=2026&bulan=10");
await api("admin GET /api/siswa?stats=1&tahun=2026&bulan=10", a, "/api/siswa?stats=1&tahun=2026&bulan=10");
await api("sekolah GET /api/jurnal?status=menunggu_sekolah&limit=300", k, "/api/jurnal?status=menunggu_sekolah&limit=300");
await api("sekolah GET /api/jurnal?status=diterima,ditolak&limit=5", k, "/api/jurnal?status=diterima,ditolak&limit=5");
await api("dudi GET /api/jurnal?status=menunggu_dudi&limit=300", d, "/api/jurnal?status=menunggu_dudi&limit=300");
await api("dudi GET /api/siswa?stats=1&tahun=2026&bulan=10", d, "/api/siswa?stats=1&tahun=2026&bulan=10");

console.log("--- TTFB halaman (latensi terbaik dari 3) ---");
await page("admin /admin", a, "/admin");
await page("admin /admin/absensi", a, "/admin/absensi");
await page("admin /admin/siswa", a, "/admin/siswa");
await page("sekolah /pembimbing-sekolah", k, "/pembimbing-sekolah");
await page("sekolah /pembimbing-sekolah/verifikasi", k, "/pembimbing-sekolah/verifikasi");
await page("dudi /pembimbing-dudi", d, "/pembimbing-dudi");
await page("dudi /pembimbing-dudi/verifikasi", d, "/pembimbing-dudi/verifikasi");
await page("dudi /pembimbing-dudi/siswa", d, "/pembimbing-dudi/siswa");
