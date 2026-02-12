import * as React from "react";

import { cn } from "@/lib/cn";

export function SelectNative({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
        className,
      )}
      {...props}
    />
  );
}
