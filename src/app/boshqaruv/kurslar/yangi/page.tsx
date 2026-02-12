import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { NewCourseForm } from "@/features/courses/components/new-course-form";

export default function NewCoursePage() {
  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Yangi kurs yaratish"
        description="Asosiy ma'lumotlarni kiriting va keyingi bosqichda modul/darslarni qurishni boshlang."
      />
      <NewCourseForm />
    </PageContainer>
  );
}
