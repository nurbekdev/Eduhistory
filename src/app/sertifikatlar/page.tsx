import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";
  const t = getT(locale);

  const certificates = await prisma.certificate.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      course: {
        select: {
          title: true,
          category: true,
        },
      },
    },
    orderBy: {
      issuedAt: "desc",
    },
  });

  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title={t("certificates.title")}
        description={t("certificates.subtitle")}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {certificates.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">{t("certificates.empty")}</CardContent>
          </Card>
        ) : (
          certificates.map((certificate) => (
            <Card key={certificate.id} className="flex flex-col">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{certificate.course.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">{certificate.finalScore}%</Badge>
                </div>
                <CardDescription className="text-xs">{certificate.course.category}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-0.5 py-0 text-xs text-zinc-600 dark:text-zinc-400">
                <p>{t("certificates.completion")}: {certificate.completionPercent}% · {t("certificates.quizzes")}: {certificate.totalQuizzesPassed}</p>
                <p>{t("certificates.issued")}: {new Date(certificate.issuedAt).toLocaleDateString(locale === "uz" ? "uz-UZ" : "en-US")}</p>
              </CardContent>
              <CardFooter className="flex gap-2 pt-3">
                <Button asChild size="sm" className="flex-1">
                  <a href={certificate.pdfUrl ?? "#"} target="_blank" rel="noreferrer">
                    {t("certificates.download")}
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/sertifikat/${certificate.uuid}`}>{t("certificates.verify")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
