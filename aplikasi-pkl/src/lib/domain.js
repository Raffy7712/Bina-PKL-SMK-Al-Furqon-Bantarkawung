export const DOMAIN_EMAIL = "its-raffy.my.id";

export function emailSiswa(nis) {
  return `${String(nis ?? "").trim()}@${DOMAIN_EMAIL}`;
}
