export const NAMA_APLIKASI = "Bina-PKL";
export const NAMA_SEKOLAH = "SMK Al Furqon";

export function judulHalaman(nama) {
  return `${nama} · ${NAMA_APLIKASI} ${NAMA_SEKOLAH}`;
}
