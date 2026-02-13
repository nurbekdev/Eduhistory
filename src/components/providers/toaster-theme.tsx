"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export function ToasterWithTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Toaster
      richColors
      position="top-right"
      theme={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"}
    />
  );
}
