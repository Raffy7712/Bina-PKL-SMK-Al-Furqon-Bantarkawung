import Link from "next/link";
import Image from "next/image";

export default function SchoolLogo({ compact = false, href = "/", className = "" }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 ${className}`}
      aria-label="Bina-PKL, SMK Al Furqon Bantarkawung, ke beranda"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-brutal bg-white shadow-brutal-sm">
        <Image
          src="/logo-alfurqon.png"
          alt=""
          width={30}
          height={30}
          className="object-contain"
          priority
        />
      </span>
      {compact ? null : (
        <span className="font-display text-base leading-none sm:text-lg">
          Bina-PKL
          <span className="block text-[10px] font-bold tracking-[0.2em] text-ink/65">
            SMK Al Furqon
          </span>
        </span>
      )}
    </Link>
  );
}
