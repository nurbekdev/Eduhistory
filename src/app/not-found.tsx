import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <PageContainer>
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Sahifa topilmadi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-600">Kechirasiz, izlayotgan sahifangiz mavjud emas yoki ko'chirilgan.</p>
          <Button asChild>
            <Link href="/">Bosh sahifaga qaytish</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
