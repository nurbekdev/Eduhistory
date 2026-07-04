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
      .then((qr) => qr.toDataURL(sampleVerifyUrl, { width: 120, margin: 1, color: { dark: "#091224", light: "#ffffff" } }))
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

      <Card className="overflow-hidden border-2 border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
        <CardHeader className="border-b border-slate-200 bg-[#091224] py-4 dark:border-slate-700">
          <CardTitle className="text-center text-sm font-medium text-white">Sertifikat ko&#39;rinishi (namuna)</CardTitle>
          <p className="text-center text-xs text-[#ead39b]">Logo, imzo va QR avtomatik generatsiya qilinadi.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="relative mx-auto flex items-center justify-center bg-slate-100 px-4 py-6 dark:bg-slate-900/40"
            style={{ maxWidth: "100%" }}
          >
            <div className="relative grid aspect-[842/595] w-full max-w-4xl grid-cols-[22%_1fr_18%] overflow-hidden rounded-lg border border-[#c9b47a] bg-[#fbf7ec] shadow-xl">
              <div className="relative flex flex-col items-center justify-between bg-[#091224] px-4 py-6 text-center text-white">
                <div className="w-full">
                  {logoUrl && logoSrc ? (
                    <div className="mx-auto h-14 w-32">
                      <img src={logoSrc} alt="" className="h-full w-full object-contain object-center" />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-14 w-32 items-center justify-center border border-dashed border-[#c9b47a]/70 text-xs text-[#ead39b]">
                      Logo
                    </div>
                  )}
                  <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.18em] text-[#ead39b]">Verified credential</p>
                </div>
                <div className="grid size-24 place-items-center rounded-full border border-[#c9b47a] bg-white/95 text-[#8a6225] shadow-sm">
                  <div>
                    <p className="text-2xl font-bold leading-none">EH</p>
                    <p className="mt-1 text-[9px] text-slate-600">2026</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-[#ead39b]">Credential ID</p>
                  <p className="mt-1 text-sm font-semibold">EDH-2026</p>
                </div>
              </div>

              <div className="relative flex flex-col px-8 py-7">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <span className="text-[#007a78]">Certificate of Completion</span>
                  <span className="text-slate-500">Issued 12.02.2026</span>
                </div>
                <div className="mt-6 text-center">
                  <p className="font-serif text-5xl font-bold leading-none text-[#091224]">SERTIFIKAT</p>
                  <div className="mx-auto mt-3 h-px w-4/5 bg-[#c9b47a]" />
                  <p className="mt-5 text-sm text-slate-500">Ushbu sertifikat bilan tasdiqlanadi</p>
                  <p className="mt-3 font-serif text-3xl font-bold text-[#10203a]">Ism Familiya</p>
                  <div className="mx-auto mt-2 h-0.5 w-64 bg-[#c9b47a]" />
                  <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-slate-700">
                    Eduhistory platformasida kursni muvaffaqiyatli yakunlab, yakuniy baholash talablarini bajardi.
                  </p>
                </div>
                <div className="mx-auto mt-5 w-full border border-[#c9b47a]/70 bg-white px-5 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6225]">Kurs nomi</p>
                  <p className="mt-1 text-base font-semibold text-[#091224]">Professional kurs namunasi</p>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    ["95%", "Final ball"],
                    ["24 ta", "Darslar"],
                    ["8 ta", "Testlar"],
                    ["Tarix", "Kategoriya"],
                  ].map(([value, label]) => (
                    <div key={label} className="border border-[#d7c596] bg-white px-2 py-2 text-center">
                      <p className="text-sm font-bold text-[#091224]">{value}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-end justify-between">
                  <div className="w-36">
                  {signatureUrl && signatureSrc ? (
                    <img src={signatureSrc} alt="" className="h-12 w-full object-contain" />
                  ) : (
                    <div className="flex h-12 w-full items-center justify-center border border-dashed border-slate-300 text-[10px] text-slate-400">
                      Imzo
                    </div>
                  )}
                    <div className="mt-1 h-px bg-[#c9b47a]" />
                    <span className="mt-1 block text-[10px] font-semibold text-[#10203a]">Platforma rahbari</span>
                  </div>
                  <div className="grid size-16 place-items-center rounded-full border border-[#c9b47a] bg-white text-center text-[#8a6225]">
                    <span className="text-xl font-bold">EH</span>
                  </div>
                  <div className="w-36 text-right">
                    <div className="h-12 border border-dashed border-[#007a78]/50" />
                    <div className="mt-1 h-px bg-[#c9b47a]" />
                    <span className="mt-1 block text-[10px] font-semibold text-[#10203a]">Kurs mentori</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center border-l border-[#d7c596] bg-white px-4 py-6 text-center">
                <div className="mb-5 w-full bg-[#091224] px-3 py-3 text-white">
                  <p className="text-sm font-bold text-[#ead39b]">VERIFY</p>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/70">Scan QR</p>
                </div>
                  {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="size-24 border border-[#c9b47a] bg-white p-1" />
                  ) : (
                  <div className="flex size-24 items-center justify-center border border-dashed border-slate-300 text-[10px] text-slate-400">
                      QR
                    </div>
                  )}
                <p className="mt-4 text-xs font-semibold text-[#091224]">Haqiqiyligini tekshirish</p>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">QR kod original sertifikat sahifasiga olib boradi.</p>
                <div className="mt-auto w-full border border-[#d7c596] bg-[#f3ead3] px-2 py-2 text-[10px] font-semibold text-[#007a78]">
                  100% COMPLETION
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
