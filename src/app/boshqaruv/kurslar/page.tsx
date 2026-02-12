import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { ManageCoursesTable } from "@/features/courses/components/manage-courses-table";

export default function ManageCoursesPage() {
  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Kurslarni boshqarish"
        description="Kurslar jadvali, filter/sort, status nazorati va CRUD amallari."
      />
      <ManageCoursesTable />
    </PageContainer>
  );
}
