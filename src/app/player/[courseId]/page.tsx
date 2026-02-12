import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { CoursePlayer } from "@/features/player/components/course-player";

type CoursePlayerPageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePlayerPage({ params }: CoursePlayerPageProps) {
  const { courseId } = await params;

  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Kurs player"
        description="Yuqorida video, pastda materiallar va test bo'limlari. Progress gating real ishlaydi."
      />
      <CoursePlayer courseId={courseId} />
    </PageContainer>
  );
}
