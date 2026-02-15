import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--bg-surface)]">
      <Card className="mx-auto max-w-md border-2 text-center" style={{ borderColor: "var(--clr-gold)", background: "var(--clr-parchment)" }}>
        <CardHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full text-3xl" style={{ background: "var(--clr-dust)" }}>
            🔒
          </div>
          <CardTitle className="font-display text-2xl" style={{ color: "var(--clr-ink)" }}>
            Ruxsat yo&apos;q / Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm" style={{ color: "var(--clr-bronze)" }}>
            Bu sahifaga kirish uchun sizda yetarli huquq mavjud emas.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="font-display font-semibold" style={{ background: "var(--clr-crimson)", color: "var(--clr-parchment)", border: "2px solid var(--clr-crimson)" }}>
              <Link href="/">Bosh sahifaga qaytish</Link>
            </Button>
            <Button asChild variant="outline" className="border-[var(--clr-bronze)]" style={{ color: "var(--clr-bronze)" }}>
              <Link href="/kirish">Kirish</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
