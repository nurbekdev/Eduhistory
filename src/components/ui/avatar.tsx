import Image from "next/image";

type AvatarProps = {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Next/Image quality (1–100), default 90 for sharper display */
  quality?: number;
  priority?: boolean;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs sm:h-9 sm:w-9",
  md: "h-10 w-10 text-sm sm:h-11 sm:w-11",
  lg: "h-12 w-12 text-base sm:h-14 sm:w-14",
  xl: "h-20 w-20 text-xl sm:h-24 sm:w-24 md:h-28 md:w-28 sm:text-3xl",
};

const sizePixels = {
  sm: 72,
  md: 88,
  lg: 112,
  xl: 224,
} as const;

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt, size = "md", className = "", quality = 90, priority = false }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const px = sizePixels[size];
  const resolvedSrc = !src ? null : src;

  if (resolvedSrc) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600 ${sizeClass} ${className}`}
      >
        <Image
          src={resolvedSrc}
          alt={alt}
          width={px}
          height={px}
          sizes={size === "xl" ? "(max-width: 640px) 96px, 112px" : size === "lg" ? "56px" : size === "md" ? "44px" : "36px"}
          quality={quality}
          priority={priority}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ${sizeClass} ${className}`}
      title={alt}
    >
      {getInitials(alt)}
    </span>
  );
}
