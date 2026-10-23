"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function api(path, { method = "GET", body, signal } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Permintaan gagal (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function useApi(path, deps = []) {
  const depsKey = JSON.stringify(deps ?? []);
  const kunci = `${path}|${depsKey}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!path) return;
    const id = ++seq.current;
    const controller = new AbortController();
    api(path, { signal: controller.signal })
      .then((data) => {
        if (id === seq.current) setResult({ key: kunci, data, error: null });
      })
      .catch((err) => {
        if (err.name === "AbortError" || id !== seq.current) return;
        setResult({ key: kunci, data: null, error: err });
      });
    return () => controller.abort();
  }, [path, kunci, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (!path) {
    return { data: null, error: null, loading: false, reload };
  }

  const milikSekarang = result.key === kunci;
  return {
    data: milikSekarang ? result.data : null,
    error: milikSekarang ? result.error : null,
    loading: !milikSekarang,
    reload,
  };
}
