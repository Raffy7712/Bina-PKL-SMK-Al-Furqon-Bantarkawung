"use client";

import { useRef, useState } from "react";
import { Btn, Field } from "@/components/ui";
import { IconFile, IconUpload, IconX } from "@/components/icons";
import { api } from "@/lib/api";

export const TIPE_TERIMA =
  ".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.ppt,.pptx";
export const MAKS_UKURAN = 10 * 1024 * 1024;

export function UnggahBerkas({
  berkas = [],
  onChange,
  onError,
  label = "Lampiran",
  hint = "Gambar, PDF, DOCX, XLSX, atau PPT. Maksimal 10 MB per berkas.",
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [sibuk, setSibuk] = useState(false);
  const [drag, setDrag] = useState(false);

  async function unggah(list) {
    const dipilih = Array.from(list ?? []);
    if (!dipilih.length || sibuk) return;

    const kebesaran = dipilih.find((f) => f.size > MAKS_UKURAN);
    if (kebesaran) {
      onError?.(`"${kebesaran.name}" melebihi 10 MB`);
      return;
    }

    setSibuk(true);
    try {
      const fd = new FormData();
      for (const f of dipilih) fd.append("file", f);
      const res = await fetch("/api/berkas", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah berkas");
      onChange?.([...berkas, ...(data.berkas ?? [])]);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSibuk(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function hapus(id) {
    try {
      await api(`/api/berkas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      onChange?.(berkas.filter((b) => b.id !== id));
    } catch (err) {
      onError?.(err.message);
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) unggah(e.dataTransfer.files);
        }}
        className={`rounded-brutal px-4 py-5 text-center transition-colors ${
          drag ? "bg-sun/30" : "bg-ink/[0.04]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={TIPE_TERIMA}
          className="hidden"
          onChange={(e) => unggah(e.target.files)}
          disabled={disabled || sibuk}
        />
        <Btn
          tone="white"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || sibuk}
        >
          <IconUpload size={15} />
          {sibuk ? "Mengunggah…" : "Pilih berkas"}
        </Btn>
        <p className="mt-2 text-xs font-normal text-ink/60">
          atau tarik berkas ke sini
        </p>
      </div>

      {berkas.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {berkas.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-brutal bg-paper px-3 py-2"
            >
              <IconFile size={15} />
              <a
                href={b.url}
                className="min-w-0 flex-1 truncate text-sm font-normal underline decoration-1 underline-offset-2 hover:text-marine"
                target="_blank"
                rel="noopener noreferrer"
              >
                {b.nama}
              </a>
              <span className="shrink-0 text-xs text-ink/60">{b.ukuranTeks}</span>
              {disabled ? null : (
                <button
                  type="button"
                  onClick={() => hapus(b.id)}
                  aria-label={`Hapus ${b.nama}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-brutal hover:bg-cherry/20"
                >
                  <IconX size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}
