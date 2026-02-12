import { SkeletonPage } from "@/components/shared/skeleton-page";

export default function CertificateSettingsPage() {
  return (
    <SkeletonPage
      tag="Sertifikat"
      title="Sertifikat sozlamalari"
      description="PDF shablon, imzo maydoni, verify URL format va branding sozlamalari."
      items={["Shablon tanlash", "Imzo va logo", "Verify URL qoidasi", "QR matn maydoni"]}
    />
  );
}
