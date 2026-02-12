import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Ruxsat yo'q</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-600">Bu sahifaga kirish uchun sizda yetarli huquq mavjud emas.</p>
          <Button asChild>
            <Link href="/">Bosh sahifaga qaytish</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
