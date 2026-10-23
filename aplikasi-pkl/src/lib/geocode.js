
const UA = "Bina-PKL-Geocoder/1.0 (aplikasi PKL sekolah; kontak: admin@its-raffy.my.id)";

function num(s) {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseMapsUrl(url) {
  const data = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (data) {
    return { lat: num(data[1]), lng: num(data[2]), label: labelFromPath(url) };
  }
  const at = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) return { lat: num(at[1]), lng: num(at[2]), label: labelFromPath(url) };
  for (const key of ["q", "query", "center", "ll"]) {
    const m = url.match(new RegExp(`[?&]${key}=(-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*)`));
    if (m) return { lat: num(m[1]), lng: num(m[2]), label: labelFromPath(url) };
  }
  return null;
}

function labelFromPath(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/place\/([^/]+)/);
    if (m) {
      return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
    }
  } catch {
  }
  return null;
}

function isMapsHost(hostname) {
  return /(^|\.)google\.[a-z.]+$/.test(hostname) || hostname === "maps.app.goo.gl";
}

function bolehDiambil(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && isMapsHost(u.hostname);
  } catch {
    return false;
  }
}

async function nominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const rows = await res.json();
  if (!rows.length) return null;
  return {
    lat: num(rows[0].lat),
    lng: num(rows[0].lon),
    label: rows[0].display_name,
  };
}

export async function resolveLocation(input) {
  const raw = String(input ?? "").trim();
  if (!raw) throw new Error("Lokasi kosong");

  const pair = raw.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (pair) {
    return { lat: num(pair[1]), lng: num(pair[2]), label: null, source: "koordinat" };
  }

  let url = null;
  if (/^https?:\/\//i.test(raw)) {
    const direct = parseMapsUrl(raw);
    if (direct && isMapsHost(new URL(raw).hostname)) {
      if (direct.lat != null && direct.lng != null) {
        return { ...direct, source: "google_maps" };
      }
    }
    url = raw;
  } else if (/^(www\.)/i.test(raw)) {
    url = `https://${raw}`;
  }

  if (url) {
    if (!bolehDiambil(url)) {
      const found = await nominatim(raw);
      if (found) return { ...found, source: "nominatim" };
      throw new Error("Tautan tidak dikenali. Tempel link Google Maps atau tulis alamatnya.");
    }

    const kandidat = [url];
    let locAbs = null;
    let statusTerkahir = null;
    for (let coba = 0; coba < 2 && !locAbs; coba++) {
      if (coba > 0) await new Promise((r) => setTimeout(r, 600));
      let ulang = false;
      try {
        const res = await fetch(url, {
          redirect: "manual",
          signal: AbortSignal.timeout(12_000),
          headers: { "User-Agent": UA },
        });
        statusTerkahir = res.status;
        const loc = res.headers.get("location");
        if (loc) {
          locAbs = new URL(loc, url).href;
          kandidat.unshift(locAbs);
        } else if (res.ok && res.url && res.url !== url) {
          kandidat.unshift(res.url);
        } else {
          ulang =
            res.status === 429 ||
            res.status >= 500 ||
            (res.status >= 300 && res.status < 400);
        }
      } catch {
        ulang = true;
      }
      if (!ulang) break;
    }
    if (locAbs && !parseMapsUrl(locAbs) && bolehDiambil(locAbs)) {
      try {
        const res = await fetch(locAbs, {
          redirect: "follow",
          signal: AbortSignal.timeout(12_000),
          headers: { "User-Agent": UA },
        });
        if (res.url && bolehDiambil(res.url)) kandidat.unshift(res.url);
      } catch {
      }
    }

    for (const k of kandidat) {
      const parsed = parseMapsUrl(k);
      if (parsed && parsed.lat != null && parsed.lng != null) {
        return { ...parsed, source: "google_maps" };
      }
    }

    for (const k of kandidat) {
      try {
        const u = new URL(k);
        const q = u.searchParams.get("query") || u.searchParams.get("q");
        if (q && !/^https?:\/\//i.test(q)) {
          const found = await nominatim(q);
          if (found) return { ...found, source: "nominatim" };
        }
      } catch {
      }
    }
    throw new Error(
      "Tidak bisa membaca koordinat dari URL tersebut" +
        (statusTerkahir ? ` (respons Google: ${statusTerkahir})` : "")
    );
  }

  const found = await nominatim(raw);
  if (!found) throw new Error("Lokasi tidak ditemukan di peta");
  return { ...found, source: "nominatim" };
}

export function mapsLinkFromCoords(lat, lng) {
  if (lat == null || lng == null) return "";
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
