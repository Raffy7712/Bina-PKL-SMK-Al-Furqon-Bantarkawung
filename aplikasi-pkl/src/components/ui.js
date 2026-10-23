"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useOverlay } from "@/lib/pintasan";
import { IconX } from "@/components/icons";

export function Panel({ children, className = "", tone = "bg-white", as: As = "div", ...props }) {
  return (
    <As
      className={`rounded-brutal ring-1 ring-ink/[0.06] shadow-[0_1px_2px_rgba(14,26,24,0.05)] ${tone} ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}

const BTN_TONES = {
  yellow: "bg-sun text-ink",
  blue: "bg-marine text-white",
  green: "bg-mint text-ink",
  pink: "bg-candy text-ink",
  purple: "bg-grape text-ink",
  orange: "bg-tang text-white",
  red: "bg-cherry text-ink",
  ink: "bg-ink text-white",
  white: "bg-paper text-ink",
};

const BTN_SIZES = {
  sm: "px-3.5 py-2 text-xs gap-1.5 min-h-11 md:min-h-9",
  md: "px-[22px] py-3 text-sm gap-2 min-h-11",
  lg: "px-7 py-4 text-base gap-2.5 min-h-12",
};

export function Btn({
  children,
  tone = "yellow",
  size = "md",
  className = "",
  href,
  type = "button",
  ...props
}) {
  const cls = `inline-flex items-center justify-center rounded-brutal font-medium tracking-[-0.01em] transition-[background-color,box-shadow,transform,opacity] duration-150 hover:brightness-[0.97] hover:shadow-[0_2px_8px_rgba(14,26,24,0.12)] active:translate-y-px disabled:opacity-40 disabled:pointer-events-none ${BTN_TONES[tone]} ${BTN_SIZES[size]} ${className}`;

  if (href) {
    const internal = typeof href === "string" && href.startsWith("/");
    if (internal) {
      return (
        <Link href={href} className={cls} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}

const TONE_GELAP = new Set(["bg-marine", "bg-tang", "bg-ink"]);

const TONES = {
  yellow: "bg-sun",
  blue: "bg-marine text-white",
  green: "bg-mint",
  pink: "bg-candy",
  purple: "bg-grape",
  orange: "bg-tang text-white",
  red: "bg-cherry",
  ink: "bg-ink text-white",
  white: "bg-paper",
  gray: "bg-paper",
};

export function Badge({ children, tone = "white", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const JURNAL_STATUS = {
  menunggu_dudi: { label: "Menunggu DUDI", tone: "yellow" },
  menunggu_sekolah: { label: "Menunggu Sekolah", tone: "blue" },
  diterima: { label: "Diterima", tone: "green" },
  ditolak: { label: "Ditolak", tone: "red" },
};

export function StatusBadge({ status, children }) {
  const meta = JURNAL_STATUS[status] ?? { label: status, tone: "white" };
  return <Badge tone={meta.tone}>{children ?? meta.label}</Badge>;
}

export const LAPORAN_STATUS = {
  draft: { label: "Draft", tone: "gray" },
  terkirim: { label: "Terkirim", tone: "yellow" },
  revisi: { label: "Perlu Revisi", tone: "orange" },
  diterima: { label: "Diterima", tone: "green" },
};

export function LaporanBadge({ status }) {
  const meta = LAPORAN_STATUS[status] ?? { label: status, tone: "white" };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink/70">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs font-medium text-ink/65">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-brutal bg-ink/[0.035] px-3.5 py-2.5 text-sm placeholder:text-ink/65 transition-[background-color,box-shadow] duration-150 hover:bg-ink/[0.055] focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/15";

export function Input({ className = "", ...props }) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${inputCls} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Chip({ active = false, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-brutal px-3.5 py-2 text-sm font-semibold transition-colors md:min-h-9 ${
        active
          ? "bg-ink text-white"
          : "bg-ink/[0.04] text-ink/70 hover:bg-ink/[0.08]"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, sub, tone = "bg-white", icon }) {
  const chip =
    tone === "bg-white" || tone === "bg-paper" ? "bg-ink/[0.06]" : tone;
  const teksChip = TONE_GELAP.has(tone) ? "text-white" : "text-ink/75";

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/60">{label}</p>
          <p className="font-display mt-2 text-[2rem] font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-[2.5rem]">
            {value}
          </p>
          {sub ? (
            <p className="mt-2 text-xs leading-relaxed text-ink/60">{sub}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${chip} ${teksChip}`}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}

export function microCls(gelap) {
  return gelap
    ? "text-[11px] font-medium text-white"
    : "text-[11px] font-medium text-ink/65";
}

export function Progress({ value = 0, tone = "bg-mint", className = "" }) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-ink/10 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full transition-all ${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const AVATAR_TONES = ["bg-sun", "bg-candy", "bg-marine", "bg-mint", "bg-grape", "bg-tang"];

export function Avatar({ name = "?", size = "md", className = "", src = null }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const tone =
    AVATAR_TONES[
      Math.abs(
        name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      ) % AVATAR_TONES.length
    ];
  const gelap = tone === "bg-marine" || tone === "bg-tang";
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-lg",
  };
  if (src) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`shrink-0 rounded-full bg-cover bg-center ${sizes[size]} ${className}`}
        style={{ backgroundImage: `url("${src}")` }}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-medium ${tone} ${gelap ? "text-white" : ""} ${sizes[size]} ${className}`}
    >
      {initials}
    </span>
  );
}

export function PageHeader({ title, desc, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.65rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.1rem]">{title}</h1>
        {desc ? (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink/60">{desc}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold tracking-[-0.01em] sm:text-xl">{children}</h2>
      {right}
    </div>
  );
}

const STEPS = ["Menunggu DUDI", "Diterima DUDI", "Diterima Sekolah"];

export function VerifySteps({ status }) {
  const current =
    status === "diterima" ? 2 : status === "menunggu_sekolah" ? 1 : status === "ditolak" ? -1 : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((label, i) => {
        const done = current > i || status === "diterima";
        const isReject = status === "ditolak" && i === 0;
        return (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                isReject
                  ? "bg-cherry"
                  : done
                    ? "bg-mint"
                    : i === current
                      ? "bg-sun"
                      : "bg-white text-ink/65"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="text-ink/65" aria-hidden>
                →
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useOverlay(open, () => onCloseRef.current?.());

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const root = ref.current;
      if (!root) return;
      if (root.contains(document.activeElement)) return;
      const target =
        root.querySelector("[data-autofocus]") ??
        root.querySelector("input, textarea, select");
      target?.focus();
    }, 40);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 pt-10 backdrop-blur-[2px]">
      <div
        ref={ref}
        className="w-full max-w-lg animate-pop rounded-brutal bg-white shadow-brutal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-white px-5 py-4">
          <h3 id={titleId} className="font-display text-lg font-bold tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-11 w-11 place-items-center rounded-brutal bg-ink/[0.04] transition-colors hover:bg-ink/[0.08] active:opacity-90"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-ink/15 bg-white px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, desc, action }) {
  return (
    <div className="rounded-brutal bg-white/60 px-6 py-10 text-center ring-1 ring-ink/[0.05]">
      <p className="text-base font-semibold">{title}</p>
      {desc ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink/60">
          {desc}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function BarChart({ data = [], tone = "bg-marine", height = 140 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold">{d.value}</span>
          <div
            className={`w-full rounded-t-md transition-all group-hover:opacity-85 ${tone}`}
            style={{ height: `${Math.max(6, (d.value / max) * (height - 34))}px` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] font-bold text-ink/65">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Toast({ show, children }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-brutal bg-mint px-4 py-2.5 text-sm font-medium shadow-[0_6px_20px_rgba(14,26,24,0.18)] transition-all print:hidden ${
        show ? "animate-pop" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Memuat…"
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-ink/25 border-t-ink ${className}`}
    />
  );
}

export function LoadingBlock({ label = "Memuat data…" }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-brutal bg-white/60 px-5 py-4"
    >
      <Spinner />
      <span className="text-sm font-normal text-ink/65">
        {label}
      </span>
    </div>
  );
}

export function TableWrap({ children, className = "" }) {
  return (
    <Panel className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">{children}</div>
    </Panel>
  );
}

export const thCls =
  "border-b border-ink/10 bg-white/60 px-4 py-3 text-left text-[12px] font-medium text-ink/65";

export const tdCls = "px-4 py-3.5 align-middle text-sm font-normal";

export function Th({ children, className = "" }) {
  return <th scope="col" className={`${thCls} ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }) {
  return <td className={`${tdCls} ${className}`}>{children}</td>;
}

export const trCls =
  "border-b border-ink/[0.07] transition-colors last:border-0 hover:bg-ink/[0.02]";
