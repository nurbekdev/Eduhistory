"use client";

import { useState } from "react";
import { Copy, Link2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CertificateShareBlock({ uuid, verifyUrl: initialUrl }: { uuid: string; verifyUrl?: string }) {
  const [copied, setCopied] = useState(false);

  const getVerifyUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/sertifikat/${uuid}`;
    }
    return initialUrl ?? `${process.env.NEXTAUTH_URL ?? ""}/sertifikat/${uuid}`;
  };

  const handleCopy = async () => {
    const url = getVerifyUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: show url in alert
      prompt("Havolani nusxalash:", url);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Link2 className="size-4" />
        Sertifikat havolasini ulashish
      </p>
      <p className="mb-2 break-all text-xs text-slate-500 dark:text-slate-400">
        {getVerifyUrl()}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="mr-2 size-4 text-emerald-600" />
            Nusxalandi
          </>
        ) : (
          <>
            <Copy className="mr-2 size-4" />
            Havolani nusxalash
          </>
        )}
      </Button>
    </div>
  );
}
