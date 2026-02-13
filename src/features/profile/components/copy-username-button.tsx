"use client";

import { Copy } from "lucide-react";

export function CopyUsernameButton({ username }: { username: string }) {
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(username);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      aria-label="Username nusxalash"
    >
      <Copy className="size-4" />
    </button>
  );
}
