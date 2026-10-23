import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import readXlsxFile from "read-excel-file/node";
import { deteksiKolom, siapkanImpor, selTeks, normJudul } from "../src/lib/xlsx-import.js";
import { bangunTemplateSiswa } from "../src/lib/xlsx-tulis.js";

let lolos = 0;
let gagal = 0;

function t(nama, fn) {
  try {
    fn();
    lolos++;
    console.log(`  ✓ ${nama}`);
  } catch (e) {
    gagal++;
    process.exitCode = 1;
    console.error(`  ✗ ${nama}\n    ${e.message}`);
  }
}

async function tAsync(nama, fn) {
  try {
    await fn();
    lolos++;
    console.log(`  ✓ ${nama}`);
  } catch (e) {
    gagal++;
    process.exitCode = 1;
    console.error(`  ✗ ${nama}\n    ${e.message}`);
  }
}

console.log("deteksiKolom");
t("judul resmi template", () => {
  assert.deepEqual(deteksiKolom(["NIS", "Nama", "Kelas", "Mitra"]), {
    nis: 0, nama: 1, kelas: 2, mitra: 3,
  });
});
t("sinonim umum (No. Induk, Rombel, Tempat PKL)", () => {
  assert.deepEqual(deteksiKolom(["No. Induk", "Nama Siswa", "Rombel", "Tempat PKL"]), {
    nis: 0, nama: 1, kelas: 2, mitra: 3,
  });
});
t("parsial tidak saling berebut kolom", () => {
  const k = deteksiKolom(["No Induk Siswa", "Nama Siswa", "Kelas"]);
  assert.equal(k.nis, 0);
  assert.equal(k.nama, 1);
  assert.equal(k.kelas, 2);
});
t("judul tak dikenal → -1", () => {
  const k = deteksiKolom(["Kolom A", "Kolom B"]);
  assert.equal(k.nis, -1);
  assert.equal(k.nama, -1);
});

console.log("selTeks & normJudul");
t("angka → string tanpa desimal", () => {
  assert.equal(selTeks(2401901), "2401901");
});
t("null → \"\", teks di-trim", () => {
  assert.equal(selTeks(null), "");
  assert.equal(selTeks("  Budi  "), "Budi");
});
t("normJudul merapikan tanda baca", () => {
  assert.equal(normJudul("No.  Induk!"), "no induk");
});

console.log("siapkanImpor");
{
  const data = [
    ["No Induk", "Nama Siswa", "Rombel", "Tempat PKL"],
    [2401901, "Budi Santoso", "XII RPL 1", "PT Nusantara Digital"],
    [null, null, null, null],
    [2401902, "", "XII TKJ 1", null],
    [2401901, "Duplikat Budi", "XII RPL 1", null],
    ["", "Anak Tanpa NIS", "XII DKV 1", null],
    [2401903, "Sudah Terdaftar", "XII AKL 1", null],
    [2401904, "Mitra Hilang", "XII AKL 1", "PT Larut"],
  ];
  const r = siapkanImpor(data, {
    nisTerdaftar: ["2401903"],
    mitraDikenal: ["PT Nusantara Digital"],
  });

  t("baris kosong tidak dihitung", () => assert.equal(r.baris.length, 6));
  t("hanya baris valid yang siap", () => {
    assert.equal(r.siap.length, 1);
    assert.equal(r.siap[0].nis, "2401901");
    assert.equal(r.siap[0].nama, "Budi Santoso");
    assert.equal(r.siap[0].mitra, "PT Nusantara Digital");
  });
  t("NIS ganda di berkas terdeteksi", () => {
    const b = r.baris.find((x) => x.nama === "Duplikat Budi");
    assert.match(b.masalah.join(" "), /sama dengan baris 2/);
  });
  t("NIS terdaftar di DB terdeteksi", () => {
    const b = r.baris.find((x) => x.nama === "Sudah Terdaftar");
    assert.match(b.masalah.join(" "), /sudah terdaftar/);
  });
  t("mitra tak dikenal terdeteksi", () => {
    const b = r.baris.find((x) => x.nama === "Mitra Hilang");
    assert.match(b.masalah.join(" "), /tidak dikenal/);
  });
  t("wajib NIS & nama", () => {
    assert.match(r.baris.find((x) => x.nama === "Anak Tanpa NIS").masalah.join(" "), /NIS wajib/);
    assert.match(r.baris.find((x) => x.nis === "2401902").masalah.join(" "), /Nama wajib/);
  });
}
{
  t("kelas tak dikenal terdeteksi, kosong / \"Belum ditentukan\" diterima", () => {
    const r = siapkanImpor(
      [
        ["NIS", "Nama", "Kelas"],
        [1, "A", "XII RPL 1"],
        [2, "B", "XII RPL 9"],
        [3, "C", ""],
        [4, "D", "Belum ditentukan"],
      ],
      { kelasDikenal: ["XII RPL 1", "XII TKJ 1"] }
    );
    assert.equal(r.siap.length, 3);
    const b = r.baris.find((x) => x.nis === "2");
    assert.match(b.masalah.join(" "), /belum terdaftar/);
    assert.ok(r.siap.some((x) => x.nis === "3"));
    assert.ok(r.siap.some((x) => x.nis === "4"));
  });
  t("daftar kelas kosong → cek kelas dilewati", () => {
    const r = siapkanImpor(
      [
        ["NIS", "Nama", "Kelas"],
        [1, "A", "XII APA SAJA"],
      ],
      { kelasDikenal: [] }
    );
    assert.equal(r.siap.length, 1);
  });
  t("daftar mitra kosong → cek mitra dilewati", () => {
    const r = siapkanImpor([["NIS", "Nama", "Mitra"], [1, "A", "PT Bebas"]], {
      mitraDikenal: [],
    });
    assert.equal(r.siap.length, 1);
  });
  t("berkas kosong → galat", () => {
    assert.ok(siapkanImpor([]).galat);
  });
  t("tanpa judul NIS/Nama → galat", () => {
    assert.ok(siapkanImpor([["Kolom A"], ["isi"]]).galat);
  });
}

const KELAS_UJI = ["XII RPL 1", "XII TKJ 1", "XII DKV 1"];
const MITRA_UJI = ["PT Nusantara Digital", "CV Kreatif Media"];

function bukaZip(berkas) {
  const u8 = new Uint8Array(berkas.buffer, berkas.byteOffset, berkas.byteLength);
  const tampilan = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

  let eocd = -1;
  for (let i = u8.length - 22; i >= 0; i--) {
    if (tampilan.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.ok(eocd >= 0, "EOCD tidak ditemukan di berkas ZIP");

  const jumlah = tampilan.getUint16(eocd + 10, true);
  let pos = tampilan.getUint32(eocd + 16, true);
  const entri = new Map();

  for (let i = 0; i < jumlah; i++) {
    assert.equal(tampilan.getUint32(pos, true), 0x02014b50, "central directory rusak");
    const metode = tampilan.getUint16(pos + 10, true);
    const ukuran = tampilan.getUint32(pos + 20, true);
    const nNama = tampilan.getUint16(pos + 28, true);
    const nEkstra = tampilan.getUint16(pos + 30, true);
    const nKomentar = tampilan.getUint16(pos + 32, true);
    const lokal = tampilan.getUint32(pos + 42, true);
    const nama = new TextDecoder().decode(u8.subarray(pos + 46, pos + 46 + nNama));

    assert.equal(tampilan.getUint32(lokal, true), 0x04034b50, `local header ${nama} rusak`);
    const nNamaLokal = tampilan.getUint16(lokal + 26, true);
    const nEkstraLokal = tampilan.getUint16(lokal + 28, true);
    const awal = lokal + 30 + nNamaLokal + nEkstraLokal;
    const mampat = u8.subarray(awal, awal + ukuran);
    entri.set(nama, metode === 8 ? Buffer.from(inflateRawSync(mampat)) : Buffer.from(mampat));

    pos += 46 + nNama + nEkstra + nKomentar;
  }

  return entri;
}

console.log("bangunTemplateSiswa");
const templateUji = bangunTemplateSiswa({ kelas: KELAS_UJI, mitra: MITRA_UJI });

t("struktur ZIP: delapan entri sesuai kontrak XLSX", () => {
  const entri = bukaZip(templateUji);
  assert.deepEqual([...entri.keys()].sort(), [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/_rels/workbook.xml.rels",
    "xl/sharedStrings.xml",
    "xl/styles.xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
  ]);
});

await tAsync("terbaca read-excel-file: sheet, judul, header, & daftar", async () => {
  const lembar = await readXlsxFile(templateUji);
  assert.deepEqual(lembar.map((l) => l.sheet), ["Template", "Daftar"]);

  const data = lembar.find((l) => l.sheet === "Template").data;
  assert.equal(data.length, 4, "tanpa baris data tambahan");
  assert.equal(data[0][0], "TEMPLATE INPUT DATA SISWA");
  assert.equal(data[1][0], "APLIKASI Bina-PKL SMK AL FURQON BANTARKAWUNG");
  assert.deepEqual(data[3].map((v) => v ?? ""), ["NO", "NIS", "NAMA", "KELAS", "MITRA"]);

  const daftar = lembar.find((l) => l.sheet === "Daftar").data;
  assert.deepEqual(daftar, [
    ["Kelas", "Mitra"],
    ["XII RPL 1", "PT Nusantara Digital"],
    ["XII TKJ 1", "CV Kreatif Media"],
    ["XII DKV 1", null],
  ]);
});

await tAsync("integrasi parser: kolom & baris terbaca benar", async () => {
  const data = (await readXlsxFile(templateUji)).find((l) => l.sheet === "Template").data;
  assert.deepEqual(deteksiKolom(data[3]), { nis: 1, nama: 2, kelas: 3, mitra: 4 });

  assert.match(siapkanImpor(data).galat ?? "", /Tidak ada baris data/);

  const r = siapkanImpor(
    [...data, [1, 2401999, "Budi Santoso", "XII RPL 1", "PT Nusantara Digital"]],
    { nisTerdaftar: [], mitraDikenal: MITRA_UJI, kelasDikenal: KELAS_UJI }
  );
  assert.ok(!r.galat, r.galat);
  assert.deepEqual(r.kolom, { nis: 1, nama: 2, kelas: 3, mitra: 4 });
  assert.equal(r.baris.length, 1);
  assert.equal(r.siap.length, 1);
  assert.equal(r.siap[0].nis, "2401999");
});

t("XML: dua dataValidation, merge lebih dulu, & lembar Daftar tersembunyi", () => {
  const entri = bukaZip(templateUji);
  const sheet1 = entri.get("xl/worksheets/sheet1.xml").toString("utf8");
  const wb = entri.get("xl/workbook.xml").toString("utf8");

  assert.equal((sheet1.match(/<dataValidation\b/g) ?? []).length, 2);
  assert.ok(sheet1.includes("<mergeCells"));
  assert.ok(sheet1.includes("<dataValidations"));
  assert.match(sheet1, /sqref="D5:D1000"/);
  assert.match(sheet1, /sqref="E5:E1000"/);
  assert.ok(sheet1.includes("<formula1>Daftar!$A$2:$A$4</formula1>"));
  assert.ok(sheet1.includes("<formula1>Daftar!$B$2:$B$3</formula1>"));
  assert.ok(
    sheet1.indexOf("<mergeCells") < sheet1.indexOf("<dataValidations"),
    "mergeCells harus sebelum dataValidations"
  );
  assert.match(sheet1, /ySplit="4" topLeftCell="A5"/);
  assert.match(wb, /state="hidden"/);
});

t("daftar kosong: berkas tetap valid tanpa dataValidation", () => {
  const entri = bukaZip(bangunTemplateSiswa());
  const sheet1 = entri.get("xl/worksheets/sheet1.xml").toString("utf8");
  assert.ok(!sheet1.includes("<dataValidation"));
  assert.match(entri.get("xl/workbook.xml").toString("utf8"), /state="hidden"/);
});

await tAsync("daftar kosong: tetap terbaca & baris data lolos parser", async () => {
  const data = (await readXlsxFile(bangunTemplateSiswa())).find(
    (l) => l.sheet === "Template"
  ).data;
  assert.deepEqual(data[3].map((v) => v ?? ""), ["NO", "NIS", "NAMA", "KELAS", "MITRA"]);
  const r = siapkanImpor([...data, [1, 2401999, "Budi", "", ""]]);
  assert.ok(!r.galat, r.galat);
  assert.equal(r.siap.length, 1);
});

await tAsync("daftar dibersihkan: trim, buang kosong, dedupe tanpa peduli huruf", async () => {
  const buf = bangunTemplateSiswa({
    kelas: [" XII RPL 1 ", "", "xii rpl 1", "XII TKJ 1"],
    mitra: ["   ", "PT A"],
  });
  const daftar = (await readXlsxFile(buf)).find((l) => l.sheet === "Daftar").data;
  assert.deepEqual(daftar, [
    ["Kelas", "Mitra"],
    ["XII RPL 1", "PT A"],
    ["XII TKJ 1", null],
  ]);
});

await tAsync("teks di-escape: nama kelas bermuatan & < > tetap utuh", async () => {
  const buf = bangunTemplateSiswa({ kelas: ['XII RPL "A" & <B>'], mitra: [] });
  const daftar = (await readXlsxFile(buf)).find((l) => l.sheet === "Daftar").data;
  assert.equal(daftar[1][0], 'XII RPL "A" & <B>');
  const sheet1 = bukaZip(buf).get("xl/worksheets/sheet1.xml").toString("utf8");
  assert.ok(sheet1.includes("<formula1>Daftar!$A$2:$A$2</formula1>"), "dropdown satu kelas");
});

console.log("====================");
console.log(`LULUS: ${lolos}   GAGAL: ${gagal}`);
