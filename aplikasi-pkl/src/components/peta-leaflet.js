"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const toLatLng = (c) =>
  Array.isArray(c) ? [c[0], c[1]] : [c?.lat ?? -6.9175, c?.lng ?? 107.6191];

export default function PetaLeaflet({
  center = { lat: -6.9175, lng: 107.6191 },
  zoom = 14,
  markers = [],
  height = 360,
  interaktif = true,
  onPilih,
  lingkaran = [],
  className = "",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pilihRef = useRef(onPilih);

  useEffect(() => {
    pilihRef.current = onPilih;
  });

  useEffect(() => {
    let batal = false;
    let map = null;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default ?? mod;
      if (batal || !elRef.current || mapRef.current) return;

      map = L.map(elRef.current, {
        center: toLatLng(center),
        zoom,
        zoomControl: interaktif,
        dragging: interaktif,
        scrollWheelZoom: interaktif,
        doubleClickZoom: interaktif,
        attributionControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      map.on("click", (e) =>
        pilihRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng })
      );
    })();

    return () => {
      batal = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setView(toLatLng(center), zoom);
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    let batal = false;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default ?? mod;
      if (batal || !mapRef.current) return;

      layer.clearLayers();
      for (const z of lingkaran) {
        if (z?.lat == null || z?.lng == null || !z.radius) continue;
        L.circle([z.lat, z.lng], {
          radius: Number(z.radius),
          color: z.warna ?? "#02826d",
          weight: 2,
          fillColor: z.warna ?? "#02826d",
          fillOpacity: 0.12,
        }).addTo(layer);
      }
      for (const m of markers) {
        if (m?.lat == null || m?.lng == null) continue;
        const warna = m.warna ?? "#02826d";
        const icon = L.divIcon({
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 28],
          popupAnchor: [0, -26],
          html: `<span style="display:block;width:22px;height:22px;background:${warna};border:2px solid #0e1a18;border-radius:9999px;box-shadow:0 2px 6px rgba(14,26,24,0.25);"></span>`,
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(layer);
        if (m.label) marker.bindPopup(m.label);
      }
    })();

    return () => {
      batal = true;
    };
  }, [markers, lingkaran]);

  return (
    <div
      ref={elRef}
      className={`relative isolate w-full overflow-hidden rounded-brutal shadow-[0_1px_2px_rgba(14,26,24,0.06)] ${className}`}
      style={{ height }}
      role="application"
      aria-label="Peta lokasi"
    />
  );
}

export { jarakMeter } from "@/lib/jarak";
