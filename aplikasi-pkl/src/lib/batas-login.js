
const JENDELA_MS = 15 * 60 * 1000;
const MAKS_IP = 10;
const MAKS_IDENTITAS = 5;

const catatan = new Map();

function kunci(nama) {
  return nama;
}

function ambil(nama) {
  const now = Date.now();
  const isi = catatan.get(kunci(nama));
  if (!isi || now - isi.mulai > JENDELA_MS) return null;
  return isi;
}

function naikkan(nama, maks) {
  const now = Date.now();
  const isi = ambil(nama);
  if (!isi) {
    catatan.set(kunci(nama), { mulai: now, jumlah: 1 });
    return false;
  }
  isi.jumlah += 1;
  return isi.jumlah > maks;
}

export function sisaTunggu(ip, identitas) {
  const now = Date.now();
  for (const nama of [`ip:${ip}`, `id:${identitas}`]) {
    const isi = catatan.get(nama);
    if (isi && now - isi.mulai <= JENDELA_MS) {
      const batas = nama.startsWith("ip:") ? MAKS_IP : MAKS_IDENTITAS;
      if (isi.jumlah >= batas) {
        return Math.ceil((JENDELA_MS - (now - isi.mulai)) / 1000);
      }
    }
  }
  return 0;
}

export function catatGagal(ip, identitas) {
  const lewatIp = naikkan(`ip:${ip}`, MAKS_IP);
  const lewatId = identitas ? naikkan(`id:${identitas}`, MAKS_IDENTITAS) : false;
  return lewatIp || lewatId;
}

export function catatBerhasil(identitas) {
  if (identitas) catatan.delete(`id:${identitas}`);
}

export function sapuKedaluwarsa() {
  const now = Date.now();
  for (const [nama, isi] of catatan) {
    if (now - isi.mulai > JENDELA_MS) catatan.delete(nama);
  }
}
