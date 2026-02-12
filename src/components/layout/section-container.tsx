import { cn } from "@/lib/cn";

export function SectionContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>{children}</section>;
}
