
import { deflateRawSync } from "node:zlib";

const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships";

const SEL_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const KOLOM = ["A", "B", "C", "D", "E"];
const JUDUL = ["NO", "NIS", "NAMA", "KELAS", "MITRA"];

const GANTI_XML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function escapeXml(teks) {
  return String(teks).replace(/[&<>"']/g, (huruf) => GANTI_XML[huruf]);
}

function rapikanDaftar(daftar) {
  const hasil = [];
  const terlihat = new Set();
  for (const nilai of Array.isArray(daftar) ? daftar : []) {
    const teks = String(nilai ?? "").trim();
    const kunci = teks.toLowerCase();
    if (!teks || terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    hasil.push(teks);
  }
  return hasil;
}

function buatSharedStrings() {
  const daftar = [];
  const indeks = new Map();
  let jumlah = 0;
  return {
    kunci(teks) {
      jumlah++;
      const isi = String(teks);
      let i = indeks.get(isi);
      if (i === undefined) {
        i = daftar.length;
        indeks.set(isi, i);
        daftar.push(isi);
      }
      return i;
    },
    xml() {
      const si = daftar
        .map((isi) => `<si><t xml:space="preserve">${escapeXml(isi)}</t></si>`)
        .join("");
      return `${SEL_HEADER}<sst xmlns="${NS_MAIN}" count="${jumlah}" uniqueCount="${daftar.length}">${si}</sst>`;
    },
  };
}

function selTeks(ref, indeks, gaya = 0) {
  return `<c r="${ref}"${gaya ? ` s="${gaya}"` : ""} t="s"><v>${indeks}</v></c>`;
}

function xmlLembarTemplate(teks, jmlKelas, jmlMitra) {
  const a1 = selTeks("A1", teks.kunci("TEMPLATE INPUT DATA SISWA"), 1);
  const a2 = selTeks("A2", teks.kunci("APLIKASI Bina-PKL SMK AL FURQON BANTARKAWUNG"), 1);
  const kepala = JUDUL.map((judul, i) => selTeks(`${KOLOM[i]}4`, teks.kunci(judul), 1)).join("");

  const validasi = [];
  if (jmlKelas > 0) {
    validasi.push(
      `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Kelas tidak dikenal" error="Pilih kelas dari daftar yang tersedia." sqref="D5:D1000"><formula1>Daftar!$A$2:$A$${jmlKelas + 1}</formula1></dataValidation>`
    );
  }
  if (jmlMitra > 0) {
    validasi.push(
      `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Mitra tidak dikenal" error="Pilih mitra dari daftar DUDI yang tersedia." sqref="E5:E1000"><formula1>Daftar!$B$2:$B$${jmlMitra + 1}</formula1></dataValidation>`
    );
  }

  return (
    `${SEL_HEADER}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    `<dimension ref="A1:E4"/>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0">` +
    `<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A5" sqref="A5"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="30" customWidth="1"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="30" customWidth="1"/></cols>` +
    `<sheetData><row r="1">${a1}</row><row r="2">${a2}</row><row r="4">${kepala}</row></sheetData>` +
    `<mergeCells count="2"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/></mergeCells>` +
    (validasi.length
      ? `<dataValidations count="${validasi.length}">${validasi.join("")}</dataValidations>`
      : "") +
    `</worksheet>`
  );
}

function xmlLembarDaftar(teks, kelas, mitra) {
  const baris = [
    `<row r="1">${selTeks("A1", teks.kunci("Kelas"))}${selTeks("B1", teks.kunci("Mitra"))}</row>`,
  ];
  const jumlah = Math.max(kelas.length, mitra.length);
  for (let i = 0; i < jumlah; i++) {
    const sel = [];
    if (kelas[i] !== undefined) sel.push(selTeks(`A${i + 2}`, teks.kunci(kelas[i])));
    if (mitra[i] !== undefined) sel.push(selTeks(`B${i + 2}`, teks.kunci(mitra[i])));
    baris.push(`<row r="${i + 2}">${sel.join("")}</row>`);
  }
  return (
    `${SEL_HEADER}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    `<dimension ref="A1:B${jumlah + 1}"/>` +
    `<sheetViews><sheetView workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/></cols>` +
    `<sheetData>${baris.join("")}</sheetData>` +
    `</worksheet>`
  );
}

const XML_TIPE =
  `${SEL_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `</Types>`;

const XML_REL_AKAR =
  `${SEL_HEADER}<Relationships xmlns="${NS_PKG}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const XML_REL_WORKBOOK =
  `${SEL_HEADER}<Relationships xmlns="${NS_PKG}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${NS_REL}/worksheet" Target="worksheets/sheet2.xml"/>` +
  `<Relationship Id="rId3" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/>` +
  `<Relationship Id="rId4" Type="${NS_REL}/styles" Target="styles.xml"/>` +
  `</Relationships>`;

const XML_WORKBOOK =
  `${SEL_HEADER}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
  `<sheets><sheet name="Template" sheetId="1" r:id="rId1"/><sheet name="Daftar" sheetId="2" state="hidden" r:id="rId2"/></sheets>` +
  `</workbook>`;

const XML_STYLES =
  `${SEL_HEADER}<styleSheet xmlns="${NS_MAIN}">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
  `</fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

let TabelCrc = null;
function crc32(buf) {
  if (!TabelCrc) {
    TabelCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TabelCrc[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TabelCrc[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const TANGGAL_DOS = 0x21;

function buatZip(entri) {
  const lokal = [];
  const pusat = [];
  let offset = 0;

  for (const [nama, isi] of entri) {
    const namaBuf = Buffer.from(nama, "ascii");
    const data = Buffer.from(isi, "utf8");
    const mampat = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(TANGGAL_DOS, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(mampat.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(namaBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    lokal.push(lh, namaBuf, mampat);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(TANGGAL_DOS, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(mampat.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(namaBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    pusat.push(ch, namaBuf);

    offset += 30 + namaBuf.length + mampat.length;
  }

  const pusatBuf = Buffer.concat(pusat);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entri.length, 8);
  eocd.writeUInt16LE(entri.length, 10);
  eocd.writeUInt32LE(pusatBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...lokal, pusatBuf, eocd]);
}

export function bangunTemplateSiswa({ kelas = [], mitra = [] } = {}) {
  const daftarKelas = rapikanDaftar(kelas);
  const daftarMitra = rapikanDaftar(mitra);
  const teks = buatSharedStrings();

  return buatZip([
    ["[Content_Types].xml", XML_TIPE],
    ["_rels/.rels", XML_REL_AKAR],
    ["xl/workbook.xml", XML_WORKBOOK],
    ["xl/_rels/workbook.xml.rels", XML_REL_WORKBOOK],
    ["xl/worksheets/sheet1.xml", xmlLembarTemplate(teks, daftarKelas.length, daftarMitra.length)],
    ["xl/worksheets/sheet2.xml", xmlLembarDaftar(teks, daftarKelas, daftarMitra)],
    ["xl/sharedStrings.xml", teks.xml()],
    ["xl/styles.xml", XML_STYLES],
  ]);
}
