"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Settings = {
  id: string;
  templateType: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
};

export function CertificateSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [templateType, setTemplateType] = useState("default");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/boshqaruv/certificate-settings");
    const s = (await res.json()) as Settings;
    setTemplateType(s.templateType ?? "default");
    setLogoUrl(s.logoUrl ?? null);
    setSignatureUrl(s.signatureUrl ?? null);
  }, []);

  useEffect(() => {
    loadSettings().finally(() => setLoading(false));
  }, [loadSettings]);

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const sampleVerifyUrl = `${base}/sertifikat/sample-uuid-preview`;
    import("qrcode")
      .then((qr) => qr.toDataURL(sampleVerifyUrl, { width: 80, margin: 1, color: { dark: "#065F46", light: "#ffffff" } }))
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/boshqaruv/certificate-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: templateType || null,
          logoUrl: logoUrl || null,
          signatureUrl: signatureUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Saqlash muvaffaqiyatsiz.");
    } catch (e) {
      console.error(e);
      alert("Xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      alert("Faqat rasm fayllari (JPG, PNG, WebP).");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", folder);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = (await uploadRes.json()) as { message?: string };
        throw new Error(d.message ?? "Yuklash muvaffaqiyatsiz.");
      }
      const { fileUrl } = (await uploadRes.json()) as { fileUrl: string };
      setUrl(fileUrl);
      await fetch("/api/boshqaruv/certificate-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          folder === "certificate-logo" ? { logoUrl: fileUrl } : { signatureUrl: fileUrl }
        ),
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sozlamalar yuklanmoqda...</p>
    );
  }

  const logoSrc = logoUrl?.startsWith("http") ? logoUrl : logoUrl ? `${typeof window !== "undefined" ? window.location.origin : ""}${logoUrl}` : null;
  const signatureSrc = signatureUrl?.startsWith("http") ? signatureUrl : signatureUrl ? `${typeof window !== "undefined" ? window.location.origin : ""}${signatureUrl}` : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 dark:text-slate-100">Shablon tanlash</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">PDF sertifikat shablon turi.</p>
          </CardHeader>
          <CardContent>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
            </select>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 dark:text-slate-100">Logo va imzo</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">Rasmlarni yuklang. Sertifikatda avtomatik ko&#39;rsatiladi.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">Logo</label>
              <div className="flex items-center gap-3">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                  {logoUrl ? (
                    logoSrc ? (
                      <img
                        src={logoSrc}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Logo</span>
                    )
                  ) : (
                    <Camera className="size-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    id="logo-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f, "certificate-logo", setUploadingLogo, (url) => setLogoUrl(url));
                      e.target.value = "";
                    }}
                    disabled={uploadingLogo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                    disabled={uploadingLogo}
                    className="gap-1.5"
                  >
                    {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                    {logoUrl ? "Almashtirish" : "Yuklash"}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        setLogoUrl(null);
                        await fetch("/api/boshqaruv/certificate-settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ logoUrl: "" }),
                        });
                      }}
                    >
                      O&#39;chirish
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">Imzo</label>
              <div className="flex items-center gap-3">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                  {signatureUrl ? (
                    signatureSrc ? (
                      <img
                        src={signatureSrc}
                        alt="Imzo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Imzo</span>
                    )
                  ) : (
                    <Camera className="size-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    id="signature-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f, "certificate-signature", setUploadingSignature, (url) => setSignatureUrl(url));
                      e.target.value = "";
                    }}
                    disabled={uploadingSignature}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("signature-upload")?.click()}
                    disabled={uploadingSignature}
                    className="gap-1.5"
                  >
                    {uploadingSignature ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                    {signatureUrl ? "Almashtirish" : "Yuklash"}
                  </Button>
                  {signatureUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        setSignatureUrl(null);
                        await fetch("/api/boshqaruv/certificate-settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ signatureUrl: "" }),
                        });
                      }}
                    >
                      O&#39;chirish
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Saqlash
        </Button>
      </div>

      <Card className="overflow-hidden border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-emerald-600 to-teal-600 py-4">
          <CardTitle className="text-center text-sm font-medium text-white">Sertifikat ko&#39;rinishi (namuna)</CardTitle>
          <p className="text-center text-xs text-emerald-100">Logo, imzo va QR avtomatik generatsiya qilinadi.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="relative mx-auto flex flex-col items-center justify-center px-6 py-8"
            style={{ aspectRatio: "842/595", maxWidth: "100%", minHeight: 320 }}
          >
            <div className="absolute inset-0 flex flex-col rounded-b-2xl border-x-2 border-b-2 border-slate-200 dark:border-slate-600 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80">
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 pt-6">
                {logoUrl && logoSrc ? (
                  <div className="relative h-24 w-48 max-w-[90%]">
                    <img src={logoSrc} alt="" className="h-full w-full object-contain object-center" />
                  </div>
                ) : (
                  <div className="flex h-24 w-48 max-w-[90%] items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-400">
                    Logo
                  </div>
                )}
                <p className="text-center text-lg font-bold text-slate-900 dark:text-slate-100">SERTIFIKAT</p>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">Quyidagicha tasdiqlanadi</p>
                <p className="mt-1 text-center font-semibold text-slate-900 dark:text-slate-100">Ism Familiya</p>
                <p className="text-center text-sm text-slate-600 dark:text-slate-300">Kurs nomi bo&#39;yicha kursni muvaffaqiyatli yakunladi</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Final ball: 95% • Sana: 12.02.2026</p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                <div className="flex flex-col items-center">
                  {signatureUrl && signatureSrc ? (
                    <img src={signatureSrc} alt="" className="h-12 w-24 object-contain" />
                  ) : (
                    <div className="h-12 w-24 rounded border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                      Imzo
                    </div>
                  )}
                  <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Imzo</span>
                </div>
                <div className="flex flex-col items-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR" className="size-20 rounded border border-slate-200 dark:border-slate-600" />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded border border-dashed border-slate-300 dark:border-slate-600 text-[10px] text-slate-400">
                      QR
                    </div>
                  )}
                  <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Tekshirish</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
