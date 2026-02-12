import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { CourseBuilder } from "@/features/courses/components/course-builder";

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { courseId } = await params;
  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Kursni tahrirlash"
        description="Modul/Lesson CRUD, quiz builder va publish nazorati shu yerda."
      />
      <CourseBuilder courseId={courseId} />
    </PageContainer>
  );
}
