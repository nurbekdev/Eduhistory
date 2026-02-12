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
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              Bu bo'lim keyingi bosqichda to'liq funksional holatga keltiriladi.
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
