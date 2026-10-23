"use client";

import { useEffect, useRef } from "react";

let tumpukanOverlay = [];
let listenerEscape = null;

function pasangEscape() {
  if (listenerEscape) return;
  listenerEscape = (e) => {
    if (e.key !== "Escape") return;
    const atas = tumpukanOverlay[tumpukanOverlay.length - 1];
    if (!atas) return;
    e.preventDefault();
    e.stopPropagation();
    atas.tutup();
  };
  window.addEventListener("keydown", listenerEscape);
}

function lepasEscape() {
  if (!listenerEscape) return;
  window.removeEventListener("keydown", listenerEscape);
  listenerEscape = null;
}

export function useOverlay(open, onClose) {
  const tutupRef = useRef(onClose);
  useEffect(() => {
    tutupRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const simpul = { tutup: () => tutupRef.current?.() };
    tumpukanOverlay = [...tumpukanOverlay, simpul];
    pasangEscape();
    return () => {
      tumpukanOverlay = tumpukanOverlay.filter((s) => s !== simpul);
      if (tumpukanOverlay.length === 0) lepasEscape();
    };
  }, [open]);
}
