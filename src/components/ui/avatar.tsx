import Image from "next/image";

type AvatarProps = {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const resolvedSrc = !src ? null : src;

  if (resolvedSrc) {
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600 ${sizeClass} ${className}`}
      >
        <Image
          src={resolvedSrc}
          alt={alt}
          width={size === "sm" ? 32 : size === "md" ? 40 : 48}
          height={size === "sm" ? 32 : size === "md" ? 40 : 48}
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
