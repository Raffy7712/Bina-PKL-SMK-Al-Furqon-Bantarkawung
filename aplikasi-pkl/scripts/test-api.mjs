import { DOMAIN_EMAIL } from "../src/lib/domain.js";

const B = process.env.QA_BASE ?? "http://localhost:3199";
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

const setCk = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

async function req(path, { method = "GET", body, cookie } = {}) {
  const r = await fetch(B + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const teks = await r.text();
  let json = null;
  try {
    json = JSON.parse(teks);
  } catch {
  }
  return { status: r.status, json, teks, ck: setCk(r) };
}

async function reqForm(path, { files = [], cookie, field = "file" } = {}) {
  const fd = new FormData();
  for (const f of files) fd.append(field, new Blob([f.isi], { type: f.tipe }), f.nama);
  const r = await fetch(B + path, {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    body: fd,
    redirect: "manual",
  });
  const teks = await r.text();
  let json = null;
  try {
    json = JSON.parse(teks);
  } catch {
  }
  return { status: r.status, json, teks, headers: r.headers };
}

async function login(identifier, password) {
  const r = await req("/api/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
  if (r.status !== 200) throw new Error(`login ${identifier} → ${r.status} ${r.teks.slice(0, 120)}`);
  return r.ck;
}

const AKUN = {
  admin: ["admin@its-raffy.my.id", "admin123"],
  sekolah: ["rina@its-raffy.my.id", "guru123"],
  siswa: ["2401001", "siswa123"],
  tanpaMitra: ["uji.tanpa.mitra@e2e.id", "uji123"],
};

console.log("— Fase A smoke —");
const ckAdmin = await login(...AKUN.admin);
const ckSekolah = await login(...AKUN.sekolah);
const ckSiswa = await login(...AKUN.siswa);
const ckSiswa2 = await login("2401002", "siswa123");
const ckDudi = await login("bagas@nusantara.id", "dudi123");
const ckDudiLain = await login("dewi@kreatifmedia.id", "dudi123");
let ckTanpa = null;
try {
  ckTanpa = await login(...AKUN.tanpaMitra);
} catch {
  console.log("  » fixture uji.tanpa.mitra tidak ada — bagian guard tanpa mitra dilewati");
}

{
  const anon = await req("/api/auth/status");
  const masuk = await req("/api/auth/status", { cookie: ckSiswa });
  cek(
    "auth/status: anonim 200 {masuk:false}, login 200 {masuk:true}",
    anon.status === 200 &&
      anon.json?.masuk === false &&
      masuk.status === 200 &&
      masuk.json?.masuk === true &&
      masuk.json?.user?.role === "siswa",
    `${anon.status}/${masuk.status}`
  );
}

{
  const r = await fetch(`${B}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "2401001", password: "siswa123" }),
  });
  const setCookie = (r.headers.getSetCookie?.() ?? []).join(" ");
  cek(
    "cookie sesi tidak dipaksa Secure saat diakses lewat http",
    r.status === 200 && setCookie.length > 0 && !/;\s*Secure/i.test(setCookie),
    `${r.status} ${setCookie.slice(0, 90)}`
  );
}

{
  const r = await req("/api/ringkas", { cookie: ckAdmin });
  cek(
    "ringkas.kehadiran ada & angka wajar",
    typeof r.json?.kehadiran?.persen === "number" &&
      r.json.kehadiran.persen >= 0 &&
      r.json.kehadiran.persen <= 100,
    JSON.stringify(r.json?.kehadiran)
  );
  cek(
    "ringkas.hariIni ada (dasar pengingat)",
    typeof r.json?.hariIni?.belum === "number" &&
      typeof r.json?.hariIni?.sudah === "number" &&
      typeof r.json?.hariIni?.total === "number",
    JSON.stringify(r.json?.hariIni)
  );
  cek(
    "ringkas.aktivitas: feed nyata (id/kategori/aksi/detail/waktu)",
    Array.isArray(r.json?.aktivitas) &&
      r.json.aktivitas.every((a) => a.id && a.kategori && a.aksi && a.detail && a.waktu),
    `n=${r.json?.aktivitas?.length}`
  );
}

if (ckTanpa) {
  const j = await req("/api/jurnal?limit=5", { cookie: ckTanpa });
  cek("guard: jurnal DUDI tanpa mitra = 0", j.json?.total === 0 && (j.json?.jurnal ?? []).length === 0, `total=${j.json?.total}`);

  const l = await req("/api/laporan", { cookie: ckTanpa });
  cek("guard: laporan = 0", l.json?.total === 0, `total=${l.json?.total}`);

  const s = await req("/api/siswa", { cookie: ckTanpa });
  cek("guard: siswa = 0", (s.json?.siswa ?? []).length === 0, `${(s.json?.siswa ?? []).length} baris`);

  const s2 = await req("/api/siswa?stats=1", { cookie: ckTanpa });
  cek("guard: siswa?stats=1 = 0 & stats kosong", (s2.json?.siswa ?? []).length === 0 && Object.keys(s2.json?.stats ?? {}).length === 0);

  const r = await req("/api/ringkas", { cookie: ckTanpa });
  cek("guard: ringkas nol", r.json?.jurnal?.total === 0 && (r.json?.terbaru ?? []).length === 0);
} else {
  console.log("  » SKIP: guard DUDI tanpa mitra (fixture tidak ada)");
}

{
  const s = await req("/api/siswa", { cookie: ckSiswa });
  const rows = s.json?.siswa ?? [];
  const adaSaya = rows.some((x) => x.saya);
  const a = await req("/api/siswa", { cookie: ckAdmin });
  cek("siswa: terlihat ≤ semua & ada tanda saya", rows.length >= 1 && rows.length <= (a.json?.siswa ?? []).length && adaSaya, `siswa=${rows.length} admin=${(a.json?.siswa ?? []).length}`);
}

{
  const buat = await req("/api/siswa", {
    method: "POST",
    cookie: ckAdmin,
    body: { nama: "QA Uji", nis: "QA0001", kelas: "XII RPL 1", password: "rahasia1" },
  });
  cek("POST siswa baru → 201", buat.status === 201, `${buat.status} ${buat.teks.slice(0, 120)}`);
  const id = buat.json?.siswa?.id;

  const masuk1 = await req("/api/auth/login", { method: "POST", body: { identifier: "QA0001", password: "rahasia1" } });
  cek("login QA0001 dengan sandi kustom", masuk1.status === 200, `${masuk1.status}`);

  const masukEmail = await req("/api/auth/login", {
    method: "POST",
    body: { identifier: `qa0001@${DOMAIN_EMAIL}`, password: "rahasia1" },
  });
  cek(
    "email bawaan akun baru memakai domain sekolah",
    masukEmail.status === 200,
    `${masukEmail.status} qa0001@${DOMAIN_EMAIL}`
  );

  const pat = await req(`/api/siswa/${id}`, {
    method: "PATCH",
    cookie: ckAdmin,
    body: { nama: "QA Diubah", kelas: "XII TKJ 1", status: "nonaktif" },
  });
  cek(
    "PATCH ubah nama/kelas/status",
    pat.status === 200 && pat.json?.siswa?.nama === "QA Diubah" && pat.json?.siswa?.status === "nonaktif",
    `${pat.status} ${pat.teks.slice(0, 120)}`
  );

  const dudi = await req("/api/dudi", { cookie: ckAdmin });
  const dudiId = dudi.json?.dudi?.[0]?.id;
  const pasang = await req(`/api/siswa/${id}`, { method: "PATCH", cookie: ckAdmin, body: { dudiId } });
  const lepas = await req(`/api/siswa/${id}`, { method: "PATCH", cookie: ckAdmin, body: { dudiId: null } });
  cek("PATCH pasang & lepas mitra", pasang.json?.siswa?.dudiId === dudiId && lepas.json?.siswa?.dudiId === null);

  const salah = await req(`/api/siswa/${id}`, { method: "PATCH", cookie: ckAdmin, body: { status: "ngawur" } });
  const hilang = await req("/api/siswa/tidak-ada", { method: "PATCH", cookie: ckAdmin, body: { nama: "X" } });
  cek("PATCH status ngawur → 400 & id hilang → 404", salah.status === 400 && hilang.status === 404, `${salah.status}/${hilang.status}`);

  await req(`/api/siswa/${id}`, { method: "PATCH", cookie: ckAdmin, body: { resetSandi: true } });
  const s1 = await req("/api/auth/login", { method: "POST", body: { identifier: "QA0001", password: "QA0001" } });
  const s2 = await req("/api/auth/login", { method: "POST", body: { identifier: "QA0001", password: "rahasia1" } });
  cek("reset sandi → NIS berlaku, sandi lama mati", s1.status === 200 && s2.status === 401, `${s1.status}/${s2.status}`);

  const hapus = await req(`/api/siswa/${id}`, { method: "DELETE", cookie: ckAdmin });
  const s3 = await req("/api/auth/login", { method: "POST", body: { identifier: "QA0001", password: "QA0001" } });
  const a = await req("/api/siswa", { cookie: ckAdmin });
  cek(
    "DELETE siswa → akun hilang",
    hapus.status === 200 && s3.status === 401 && !(a.json?.siswa ?? []).some((x) => x.id === id)
  );
}

{
  const buat = await req("/api/laporan", {
    method: "POST",
    cookie: ckSiswa,
    body: { judul: `QA Laporan ${Date.now()}`, berkas: { nama: "qa.pdf", ukuran: "1 MB" } },
  });
  const id = buat.json?.laporan?.id ?? buat.json?.id;
  cek("POST laporan → id", buat.status === 200 || buat.status === 201, `${buat.status} ${buat.teks.slice(0, 120)}`);

  const detailAwal = await req(`/api/laporan/${id}`, { cookie: ckSiswa });
  cek(
    "detail laporan: riwayat kirim + pelaku",
    detailAwal.status === 200 &&
      detailAwal.json?.riwayat?.length === 1 &&
      detailAwal.json.riwayat[0].aksi === "kirim" &&
      detailAwal.json.riwayat[0].oleh === "Alya Putri Ramadhani",
    JSON.stringify(detailAwal.json?.riwayat ?? detailAwal.status)
  );

  const rev = await req(`/api/laporan/${id}/review`, {
    method: "POST",
    cookie: ckSekolah,
    body: { aksi: "revisi", catatan: "Perbaiki bab 3" },
  });
  cek("review sekolah: revisi ok", rev.status === 200, `${rev.status} ${rev.teks.slice(0, 120)}`);

  const detailRevisi = await req(`/api/laporan/${id}`, { cookie: ckSiswa });
  const riwayatRevisi = detailRevisi.json?.riwayat ?? [];
  cek(
    "riwayat: permintaan revisi dari sekolah",
    detailRevisi.status === 200 &&
      riwayatRevisi.length === 2 &&
      riwayatRevisi[1].aksi === "revisi" &&
      riwayatRevisi[1].peran === "sekolah" &&
      riwayatRevisi[1].catatan === "Perbaiki bab 3",
    JSON.stringify(riwayatRevisi)
  );

  const ulang = await req("/api/laporan", {
    method: "POST",
    cookie: ckSiswa,
    body: { judul: "QA Laporan rev", revisiDari: id, jawaban: "Sudah saya perbaiki bab 3" },
  });
  cek("POST revisi dengan jawaban ok", [200, 201].includes(ulang.status), `${ulang.status} ${ulang.teks.slice(0, 120)}`);

  const lihat = await req("/api/laporan?limit=50", { cookie: ckSekolah });
  const row = (lihat.json?.laporan ?? []).find((l) => l.id === id);
  cek(
    "jawaban tersimpan & versi naik",
    row?.jawaban === "Sudah saya perbaiki bab 3" && row?.versi === 2,
    JSON.stringify({ versi: row?.versi, jawaban: row?.jawaban })
  );

  const detailKirimUlang = await req(`/api/laporan/${id}`, { cookie: ckSiswa });
  const riwayatKirimUlang = detailKirimUlang.json?.riwayat ?? [];
  cek(
    "riwayat: unggahan revisi siswa v2",
    riwayatKirimUlang.length === 3 &&
      riwayatKirimUlang[2].aksi === "revisi" &&
      riwayatKirimUlang[2].peran === "siswa" &&
      riwayatKirimUlang[2].versi === 2,
    JSON.stringify(riwayatKirimUlang)
  );

  const sebagian = await req(`/api/laporan/${id}/review`, {
    method: "POST",
    cookie: ckSekolah,
    body: { aksi: "terima", penilaian: { isi: 80 } },
  });
  cek("rubrik terisi sebagian → 400", sebagian.status === 400, `${sebagian.status} ${sebagian.teks.slice(0, 120)}`);

  const diLuarRentang = await req(`/api/laporan/${id}/review`, {
    method: "POST",
    cookie: ckSekolah,
    body: {
      aksi: "terima",
      penilaian: { isi: 101, format: 80, analisis: 80, presentasi: 80 },
    },
  });
  cek("rubrik nilai di luar 0–100 → 400", diLuarRentang.status === 400, `${diLuarRentang.status}`);

  const terima = await req(`/api/laporan/${id}/review`, {
    method: "POST",
    cookie: ckSekolah,
    body: {
      aksi: "terima",
      catatan: "Kerja bagus",
      penilaian: { isi: 80, format: 90, analisis: 70, presentasi: 100 },
    },
  });
  cek(
    "terima + rubrik + pesan → nilai akhir 85 & pesan tersimpan",
    terima.status === 200 &&
      terima.json?.laporan?.status === "diterima" &&
      terima.json?.laporan?.nilaiAkhir === 85 &&
      terima.json?.laporan?.penilaian?.format === 90 &&
      terima.json?.laporan?.feedback === "Kerja bagus",
    `${terima.status} ${terima.teks.slice(0, 160)}`
  );

  const detailAkhir = await req(`/api/laporan/${id}`, { cookie: ckSiswa });
  const riwayatAkhir = detailAkhir.json?.riwayat ?? [];
  cek(
    "detail: nilai tersimpan + riwayat terima",
    detailAkhir.status === 200 &&
      detailAkhir.json?.laporan?.nilaiAkhir === 85 &&
      riwayatAkhir.length === 4 &&
      riwayatAkhir[3].aksi === "terima" &&
      riwayatAkhir[3].oleh === "Ibu Rina Wulandari, S.Kom",
    JSON.stringify({ nilai: detailAkhir.json?.laporan?.nilaiAkhir, riwayat: riwayatAkhir })
  );

  const detailSiswaLain = await req(`/api/laporan/${id}`, { cookie: ckSiswa2 });
  const detailDudi = await req(`/api/laporan/${id}`, { cookie: ckDudi });
  const detailDudiLain = await req(`/api/laporan/${id}`, { cookie: ckDudiLain });
  const detailAnon = await req(`/api/laporan/${id}`);
  cek(
    "detail laporan: cakupan siswa/DUDI + anonim",
    detailSiswaLain.status === 403 &&
      detailDudi.status === 200 &&
      detailDudiLain.status === 403 &&
      detailAnon.status === 401,
    `${detailSiswaLain.status}/${detailDudi.status}/${detailDudiLain.status}/${detailAnon.status}`
  );
}

{
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
  const palsu = Buffer.from("ini bukan pdf sama sekali");
  const exe = Buffer.from("MZ\x90\x00\x03");

  const tolakExe = await reqForm("/api/berkas", {
    cookie: ckSiswa,
    files: [{ nama: "virus.exe", tipe: "application/octet-stream", isi: exe }],
  });
  cek("unggah .exe ditolak → 415", tolakExe.status === 415, `${tolakExe.status}`);

  const tolakIsi = await reqForm("/api/berkas", {
    cookie: ckSiswa,
    files: [{ nama: "laporan.pdf", tipe: "application/pdf", isi: palsu }],
  });
  cek(
    "isi tidak cocok ekstensi ditolak → 415",
    tolakIsi.status === 415,
    `${tolakIsi.status}`
  );

  const tanpaLogin = await reqForm("/api/berkas", {
    files: [{ nama: "a.pdf", tipe: "application/pdf", isi: pdf }],
  });
  cek("unggah tanpa login → 401", tanpaLogin.status === 401, `${tanpaLogin.status}`);

  const ok = await reqForm("/api/berkas", {
    cookie: ckSiswa,
    files: [{ nama: "bukti-kerja.pdf", tipe: "application/pdf", isi: pdf }],
  });
  const berkasId = ok.json?.berkas?.[0]?.id;
  cek(
    "unggah PDF asli → 201 + metadata",
    ok.status === 201 &&
      !!berkasId &&
      ok.json.berkas[0].nama === "bukti-kerja.pdf" &&
      ok.json.berkas[0].url === `/api/berkas/${berkasId}`,
    `${ok.status} ${ok.teks.slice(0, 120)}`
  );

  const jurnal = await req("/api/jurnal", {
    method: "POST",
    cookie: ckSiswa,
    body: {
      judul: `QA Lampiran ${Date.now()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      kegiatan: "Uji lampiran",
      berkasIds: [berkasId],
    },
  });
  const jurnalId = jurnal.json?.jurnal?.id;
  cek(
    "jurnal menerima berkasIds → lampiran tercatat",
    jurnal.status === 201 && jurnal.json?.jurnal?.lampiran === "bukti-kerja.pdf",
    `${jurnal.status} ${jurnal.json?.jurnal?.lampiran}`
  );

  const unduh = await fetch(`${B}/api/berkas/${berkasId}`, {
    headers: { cookie: ckSiswa },
    redirect: "manual",
  });
  cek(
    "unduh lampiran sendiri → 200 pdf + attachment",
    unduh.status === 200 &&
      unduh.headers.get("content-type") === "application/pdf" &&
      (unduh.headers.get("content-disposition") ?? "").includes("attachment"),
    `${unduh.status} ${unduh.headers.get("content-type")}`
  );

  const unduhLain = await fetch(`${B}/api/berkas/${berkasId}`, {
    headers: { cookie: ckSiswa2 },
    redirect: "manual",
  });
  const unduhDudi = await fetch(`${B}/api/berkas/${berkasId}`, {
    headers: { cookie: ckDudi },
    redirect: "manual",
  });
  const unduhDudiLain = await fetch(`${B}/api/berkas/${berkasId}`, {
    headers: { cookie: ckDudiLain },
    redirect: "manual",
  });
  const unduhAdmin = await fetch(`${B}/api/berkas/${berkasId}`, {
    headers: { cookie: ckAdmin },
    redirect: "manual",
  });
  cek(
    "unduh: siswa lain & DUDI lain 403, pembimbing sendiri & admin 200",
    unduhLain.status === 403 &&
      unduhDudi.status === 200 &&
      unduhDudiLain.status === 403 &&
      unduhAdmin.status === 200,
    `${unduhLain.status}/${unduhDudi.status}/${unduhDudiLain.status}/${unduhAdmin.status}`
  );

  const detail = await req(`/api/jurnal/${jurnalId}`, { cookie: ckAdmin });
  cek(
    "detail jurnal memuat berkas + url unduhan",
    detail.json?.jurnal?.berkas?.[0]?.id === berkasId &&
      detail.json.jurnal.berkas[0].url === `/api/berkas/${berkasId}`,
    JSON.stringify(detail.json?.jurnal?.berkas ?? null)
  );

  const hapusTerpakai = await req(`/api/berkas?id=${berkasId}`, {
    method: "DELETE",
    cookie: ckSiswa,
  });
  cek(
    "berkas yang sudah terkirim tidak bisa dihapus → 409",
    hapusTerpakai.status === 409,
    `${hapusTerpakai.status}`
  );
}

{
  const mitra = await req("/api/dudi?mine=1", { cookie: ckSiswa });
  const d = mitra.json?.dudi;
  cek(
    "mitra punya titik & radius check-in",
    d?.lat != null && d?.lng != null && d?.radiusM > 0,
    JSON.stringify({ lat: d?.lat, lng: d?.lng, radius: d?.radiusM })
  );

  await req("/api/checkin", { method: "DELETE", cookie: ckSiswa });
  const tanpaGps = await req("/api/checkin", { method: "POST", cookie: ckSiswa, body: {} });
  cek("checkin tanpa koordinat → 400", tanpaGps.status === 400, `${tanpaGps.status}`);

  const luar = await req("/api/checkin", {
    method: "POST",
    cookie: ckSiswa,
    body: { lat: d.lat + 0.02, lng: d.lng },
  });
  cek(
    "checkin di luar radius → 422 + jarak",
    luar.status === 422 && luar.json?.jarak > luar.json?.radius,
    `${luar.status} jarak=${luar.json?.jarak} radius=${luar.json?.radius}`
  );

  const dalam = await req("/api/checkin", {
    method: "POST",
    cookie: ckSiswa,
    body: { lat: d.lat, lng: d.lng, akurasi: 6 },
  });
  cek(
    "checkin di dalam radius → 201 + jarak/akurasi",
    dalam.status === 201 && dalam.json?.checkin?.jarak_m === 0 && dalam.json?.checkin?.akurasi_m === 6,
    `${dalam.status} ${JSON.stringify(dalam.json?.checkin ?? {})}`
  );
  await req("/api/checkin", { method: "DELETE", cookie: ckSiswa });

  const detailJurnal = await req("/api/jurnal/j1", { cookie: ckSiswa });
  cek(
    "detail jurnal: isi + lampiran + verifikator + siswa",
    detailJurnal.status === 200 &&
      typeof detailJurnal.json?.jurnal?.kegiatan === "string" &&
      Array.isArray(detailJurnal.json?.jurnal?.lampiranList) &&
      detailJurnal.json?.siswa?.nama === "Alya Putri Ramadhani",
    `${detailJurnal.status}`
  );

  const jurnalSiswaLain = await req("/api/jurnal/j1", { cookie: ckSiswa2 });
  const jurnalDudi = await req("/api/jurnal/j1", { cookie: ckDudi });
  const jurnalDudiLain = await req("/api/jurnal/j1", { cookie: ckDudiLain });
  const jurnalAdmin = await req("/api/jurnal/j1", { cookie: ckAdmin });
  cek(
    "detail jurnal: cakupan siswa/DUDI/admin",
    jurnalSiswaLain.status === 403 &&
      jurnalDudi.status === 200 &&
      jurnalDudiLain.status === 403 &&
      jurnalAdmin.status === 200,
    `${jurnalSiswaLain.status}/${jurnalDudi.status}/${jurnalDudiLain.status}/${jurnalAdmin.status}`
  );
}

{
  const daftar = await req("/api/siswa", { cookie: ckAdmin });
  const s1 = (daftar.json?.siswa ?? []).find((x) => x.nis === "2401001");

  const kirim1 = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckAdmin,
    body: { mode: "siswa", id: s1?.id, pesan: "Uji lencana pertama" },
  });
  const awal = await req("/api/notifikasi", { cookie: ckSiswa });
  cek(
    "notifikasi baru → lencana > 0",
    kirim1.status === 200 && awal.json?.belumDibaca >= 1,
    `${kirim1.status} belum=${awal.json?.belumDibaca}`
  );

  const baca = await req("/api/notifikasi/baca", {
    method: "POST",
    cookie: ckSiswa,
    body: { semua: true },
  });
  cek(
    "panel dibuka → semua dibaca & lencana 0",
    baca.status === 200 && baca.json?.belumDibaca === 0,
    `${baca.status} belum=${baca.json?.belumDibaca}`
  );

  const sesudah = await req("/api/notifikasi", { cookie: ckSiswa });
  cek(
    "lencana tetap 0 tanpa notifikasi baru",
    sesudah.json?.belumDibaca === 0,
    `belum=${sesudah.json?.belumDibaca}`
  );

  await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckAdmin,
    body: { mode: "siswa", id: s1?.id, pesan: "Uji lencana kedua" },
  });
  const lagi = await req("/api/notifikasi", { cookie: ckSiswa });
  cek(
    "notifikasi baru berikutnya → lencana muncul lagi",
    lagi.json?.belumDibaca >= 1,
    `belum=${lagi.json?.belumDibaca}`
  );

  const bukanMilikku = await req("/api/notifikasi/baca", {
    method: "POST",
    cookie: ckSiswa2,
    body: { semua: true },
  });
  const masih = await req("/api/notifikasi", { cookie: ckSiswa });
  cek(
    "tandai dibaca akun lain tidak menghapus lencana saya",
    bukanMilikku.status === 200 && masih.json?.belumDibaca >= 1,
    `${bukanMilikku.status} belum=${masih.json?.belumDibaca}`
  );
}

{
  const anon = await req("/api/notifikasi");
  cek("notifikasi tanpa login → 401", anon.status === 401, `${anon.status}`);

  const anonBaca = await req("/api/notifikasi/baca", {
    method: "POST",
    body: { semua: true },
  });
  cek("baca notifikasi tanpa login → 401", anonBaca.status === 401, `${anonBaca.status}`);

  const siswaKirim = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckSiswa,
    body: { mode: "pengingat-jurnal" },
  });
  cek("kirim notifikasi sebagai siswa → 403", siswaKirim.status === 403, `${siswaKirim.status}`);

  const siswaLog = await req("/api/notifikasi/log", { cookie: ckSiswa });
  cek("log notifikasi sebagai siswa → 403", siswaLog.status === 403, `${siswaLog.status}`);

  const siswaWa = await req("/api/wa/status", { cookie: ckSiswa });
  cek("status bot sebagai siswa → 403", siswaWa.status === 403, `${siswaWa.status}`);

  const notifSiswa = await req("/api/notifikasi", { cookie: ckSiswa });
  cek(
    "notifikasi sendiri → daftar + hitungan",
    notifSiswa.status === 200 &&
      Array.isArray(notifSiswa.json?.notifikasi) &&
      typeof notifSiswa.json?.belumDibaca === "number",
    `${notifSiswa.status}`
  );

  const tpl = await fetch(`${B}/api/siswa/template`, { headers: { cookie: ckSiswa } });
  cek("template impor sebagai siswa → 403", tpl.status === 403, `${tpl.status}`);
}

{
  const awal = await req("/api/akun", { cookie: ckSiswa });
  cek(
    "akun: username kosong & foto belum ada",
    awal.status === 200 && awal.json?.akun?.username === null && awal.json?.akun?.fotoUrl === null,
    `${awal.status} ${JSON.stringify(awal.json?.akun?.username)}`
  );

  const pendek = await req("/api/akun/username", {
    method: "POST",
    cookie: ckSiswa,
    body: { username: "a" },
  });
  cek("username terlalu pendek → 400", pendek.status === 400, `${pendek.status}`);

  const meniruEmail = await req("/api/akun/username", {
    method: "POST",
    cookie: ckSiswa,
    body: { username: "rina@its-raffy.my.id" },
  });
  cek("username tidak boleh meniru email akun lain", [400, 409].includes(meniruEmail.status), `${meniruEmail.status}`);

  const simpan = await req("/api/akun/username", {
    method: "POST",
    cookie: ckSiswa,
    body: { username: "qa.siswa" },
  });
  cek("simpan username → 200", simpan.status === 200 && simpan.json?.username === "qa.siswa", `${simpan.status} ${simpan.teks.slice(0, 100)}`);

  const ckUsername = await login("qa.siswa", "siswa123");
  cek("login pakai username berhasil", Boolean(ckUsername));

  const dobel = await req("/api/akun/username", {
    method: "POST",
    cookie: ckSiswa2,
    body: { username: "qa.siswa" },
  });
  cek("username sudah dipakai → 409", dobel.status === 409, `${dobel.status}`);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const tolakFoto = await reqForm("/api/akun/foto", {
    cookie: ckSiswa,
    field: "foto",
    files: [{ nama: "foto.png", tipe: "image/png", isi: Buffer.from("bukan gambar sama sekali") }],
  });
  cek("foto yang isinya bukan gambar ditolak → 415", tolakFoto.status === 415, `${tolakFoto.status}`);

  const simpanFoto = await reqForm("/api/akun/foto", {
    cookie: ckSiswa,
    field: "foto",
    files: [{ nama: "foto.png", tipe: "image/png", isi: png }],
  });
  cek(
    "unggah foto PNG → 201",
    simpanFoto.status === 201 && typeof simpanFoto.json?.foto === "string",
    `${simpanFoto.status} ${simpanFoto.teks.slice(0, 120)}`
  );

  const ambilFoto = await fetch(`${B}/api/akun/foto`, { headers: { cookie: ckSiswa } });
  cek(
    "ambil foto sendiri → 200 image/png",
    ambilFoto.status === 200 && (ambilFoto.headers.get("content-type") ?? "").includes("image/png"),
    `${ambilFoto.status}`
  );

  const akunFoto = await req("/api/akun", { cookie: ckSiswa });
  cek("akun: fotoUrl terisi setelah unggah", typeof akunFoto.json?.akun?.fotoUrl === "string", `${akunFoto.json?.akun?.fotoUrl}`);

  const hapusFoto = await fetch(`${B}/api/akun/foto`, { method: "DELETE", headers: { cookie: ckSiswa } });
  cek("hapus foto → 200", hapusFoto.status === 200, `${hapusFoto.status}`);

  const bersih = await req("/api/akun/username", {
    method: "POST",
    cookie: ckSiswa,
    body: { username: "" },
  });
  cek("username bisa dihapus lagi", bersih.status === 200 && bersih.json?.username === null, `${bersih.status}`);
}

{
  const adminWa = await req("/api/wa/status", { cookie: ckAdmin });
  cek(
    "status bot terbaca admin",
    adminWa.status === 200 && typeof adminWa.json?.online === "boolean",
    `${adminWa.status}`
  );

  const siswaQ = await req("/api/siswa", { cookie: ckAdmin });
  const satu = (siswaQ.json?.siswa ?? [])[0];
  const kirimSatu = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckAdmin,
    body: { mode: "pengingat-jurnal", id: satu?.id, pesan: "Halo {nama}, uji pengingat." },
  });
  cek(
    "pengingat untuk satu siswa diproses",
    kirimSatu.status === 200 && kirimSatu.json?.total === 1,
    `${kirimSatu.status} ${kirimSatu.teks.slice(0, 100)}`
  );

  const massal = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckAdmin,
    body: { mode: "pengingat-jurnal", pesan: "" },
  });
  cek(
    "pengingat massal balikan lengkap",
    massal.status === 200 &&
      typeof massal.json?.total === "number" &&
      typeof massal.json?.terkirim === "number",
    `${massal.status} ${JSON.stringify(massal.json).slice(0, 120)}`
  );

  const bukanAdmin = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckSiswa,
    body: { mode: "pengingat-jurnal", pesan: "" },
  });
  cek("pengingat oleh siswa → 403", bukanAdmin.status === 403, `${bukanAdmin.status}`);

  const siswaIdup = await req("/api/notifikasi/kirim", {
    method: "POST",
    cookie: ckAdmin,
    body: { mode: "pengingat-jurnal", id: "tidak-ada", pesan: "" },
  });
  cek("pengingat id ngawur → 409", siswaIdup.status === 409, `${siswaIdup.status}`);
}

{
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const unggah = await reqForm("/api/akun/foto", {
    cookie: ckSiswa,
    field: "foto",
    files: [{ nama: "saya.png", tipe: "image/png", isi: png }],
  });
  cek("unggah foto untuk uji lintas akun", unggah.status === 201, `${unggah.status}`);

  const daftar = await req("/api/siswa", { cookie: ckAdmin });
  const baris = (daftar.json?.siswa ?? []).find((s) => s.fotoUrl);
  cek("daftar siswa memuat fotoUrl", Boolean(baris?.fotoUrl), `${baris?.fotoUrl}`);

  if (baris?.fotoUrl) {
    const lihat = await fetch(B + baris.fotoUrl, { headers: { cookie: ckAdmin } });
    cek(
      "foto siswa bisa dibuka pembimbing/admin",
      lihat.status === 200 && (lihat.headers.get("content-type") ?? "").includes("image/png"),
      `${lihat.status}`
    );

    const anon = await fetch(B + baris.fotoUrl);
    cek("foto tanpa login → 401", anon.status === 401, `${anon.status}`);
  }

  const bersihkan = await fetch(`${B}/api/akun/foto`, {
    method: "DELETE",
    headers: { cookie: ckSiswa },
  });
  cek("bersihkan foto setelah uji", bersihkan.status === 200, `${bersihkan.status}`);
}

{
  const status = await req("/api/auth/google/status");
  cek(
    "status Google aktif dari variabel lingkungan",
    status.status === 200 && status.json?.aktif === true,
    `${status.status} ${JSON.stringify(status.json)}`
  );

  const mulai = await fetch(`${B}/api/auth/google/mulai?next=%2Fsiswa`, { redirect: "manual" });
  const lokasi = mulai.headers.get("location") ?? "";
  cek(
    "mulai login Google mengarah ke halaman otorisasi",
    [302, 307].includes(mulai.status) &&
      (lokasi.includes("accounts.google.com") ||
        lokasi.includes(process.env.GOOGLE_OAUTH_AUTHORIZE_URL ?? "x")) &&
      lokasi.includes("client_id=") &&
      lokasi.includes("redirect_uri="),
    `${mulai.status} ${lokasi.slice(0, 90)}`
  );
}

{
  const nf = await req("/halaman-qa-tidak-ada");
  cek("404 kustom tampil", nf.status === 404 && nf.teks.includes("Halaman tidak ditemukan"), `${nf.status}`);
  const hal = await req("/admin", { cookie: ckAdmin });
  cek("halaman /admin render (shell baru)", hal.status === 200 && hal.teks.includes("SMK Al Furqon"), `${hal.status}`);
}

console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
