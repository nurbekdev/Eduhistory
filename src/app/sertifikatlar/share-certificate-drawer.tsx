"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

type ShareCertificateDrawerProps = {
  shareUrl: string;
  courseTitle: string;
  shareButtonLabel: string;
  shareLinkTitle: string;
  copyLinkLabel: string;
  copiedLabel: string;
  shareToAnyLabel: string;
  shareLinkDescription: string;
};

export function ShareCertificateDrawer({
  shareUrl,
  courseTitle,
  shareButtonLabel,
  shareLinkTitle,
  copyLinkLabel,
  copiedLabel,
  shareToAnyLabel,
  shareLinkDescription,
}: ShareCertificateDrawerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback((text: string): Promise<boolean> => {
    if (typeof navigator === "undefined") return Promise.resolve(false);
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    } finally {
      document.body.removeChild(textarea);
    }
  }, []);

  const handleCopy = useCallback(() => {
    void copyToClipboard(shareUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [shareUrl, copyToClipboard]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    void copyToClipboard(shareUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [shareUrl, copyToClipboard]);

  const handleNativeShare = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({
        title: courseTitle,
        text: `${courseTitle} — sertifikat`,
        url: shareUrl,
      });
    }
  }, [shareUrl, courseTitle]);

  const canNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleOpen}
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {shareButtonLabel}
      </Button>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label={shareLinkTitle}
        aria-hidden={!open}
      >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{shareLinkTitle}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Yopish"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {shareLinkDescription}
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Havola</label>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" className="w-full" onClick={handleCopy}>
                  {copied ? copiedLabel : copyLinkLabel}
                </Button>
                {canNativeShare && (
                  <Button type="button" variant="default" className="w-full gap-2" onClick={handleNativeShare}>
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {shareToAnyLabel}
                  </Button>
                )}
              </div>
            </div>
          </aside>
    </>
  );
}
