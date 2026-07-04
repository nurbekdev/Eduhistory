"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function RegenerateCertificateButton({
  uuid,
  label = "Yangilash",
}: {
  uuid: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch(`/api/certificates/${uuid}/regenerate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? "Xatolik yuz berdi");
      }
      setDone(true);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded border-slate-300 text-xs dark:border-slate-600"
        onClick={handleRegenerate}
        disabled={loading || done}
      >
        {loading ? "Yangilanmoqda..." : done ? "✓ Yangilandi" : label}
      </Button>
      {error && (
        <p className="w-full rounded bg-red-50 px-2 py-1 text-center text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
