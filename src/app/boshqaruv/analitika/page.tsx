import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { InstructorAnalyticsDashboard } from "@/features/analytics/components/instructor-analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Kurs statistikasi"
        description="Enrollment, completion, drop-off, final test pass rate va student kesimidagi to'liq analitika."
      />
      <InstructorAnalyticsDashboard />
    </PageContainer>
  );
}
