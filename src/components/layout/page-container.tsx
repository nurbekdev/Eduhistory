import { cn } from "@/lib/cn";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full min-w-0 max-w-7xl px-3 py-6 sm:px-6 sm:py-10", className)}>{children}</div>;
}
