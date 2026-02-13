import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/section-title";

type SkeletonPageProps = {
  title: string;
  description: string;
  tag?: string;
  items: string[];
};

export function SkeletonPage({ title, description, tag = "Skeleton", items }: SkeletonPageProps) {
  return (
    <PageContainer>
      <Badge className="mb-4 w-fit">{tag}</Badge>
      <SectionTitle title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">{item}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400">
              Bu bo'lim keyingi bosqichda to'liq funksional holatga keltiriladi.
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
