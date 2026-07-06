"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

import { useHydrated } from "@/lib/use-hydrated";

export function ToasterWithTheme() {
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();
  return (
    <Toaster
      richColors
      position="top-right"
      theme={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"}
    />
  );
}
