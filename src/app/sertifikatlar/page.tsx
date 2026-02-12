import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

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
        title="Mening sertifikatlarim"
        description="Yakuniy testdan o'tilgan kurslar bo'yicha sertifikatlar ro'yxati va yuklab olish."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {certificates.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="p-6 text-sm text-zinc-600">
              Hozircha sizda sertifikatlar yo'q. Kursni yakunlab final testdan o'ting.
            </CardContent>
          </Card>
        ) : (
          certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{certificate.course.title}</CardTitle>
                  <Badge>{certificate.finalScore}%</Badge>
                </div>
                <CardDescription>{certificate.course.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-zinc-600">
                <p>Completion: {certificate.completionPercent}%</p>
                <p>Quizlar: {certificate.totalQuizzesPassed}</p>
                <p>Berilgan sana: {new Date(certificate.issuedAt).toLocaleDateString("uz-UZ")}</p>
                <p className="text-xs text-zinc-500">UUID: {certificate.uuid}</p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href={certificate.pdfUrl ?? "#"} target="_blank" rel="noreferrer">
                    PDF yuklab olish
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/sertifikat/${certificate.uuid}`}>Verify</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
