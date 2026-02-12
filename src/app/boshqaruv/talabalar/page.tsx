import { SkeletonPage } from "@/components/shared/skeleton-page";

export default function StudentsManagementPage() {
  return (
    <SkeletonPage
      tag="Talabalar"
      title="Talabalar ro'yxati"
      description="Kim qayerda to'xtagan, urinishlar soni va natijalar monitoringi."
      items={["Talabalar jadvali", "Progress filtri", "Attempt tarixi", "CSV export"]}
    />
  );
}
