import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type VerifyCertificatePageProps = {
  params: Promise<{ uuid: string }>;
};

export default async function VerifyCertificatePage({ params }: VerifyCertificatePageProps) {
  const { uuid } = await params;
  const certificate = await prisma.certificate.findUnique({
    where: { uuid },
    include: {
      user: {
        select: { fullName: true },
      },
      course: {
        select: { title: true, category: true },
      },
    },
  });

  const isValid = Boolean(certificate);

  return (
    <PageContainer>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Sertifikat tekshiruvi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge>UUID: {uuid}</Badge>
          {isValid && certificate ? (
            <>
              <div className="rounded-lg border bg-emerald-50 p-4 text-emerald-700">
                Sertifikat haqiqiy.
              </div>
              <p className="text-zinc-700">
                Talaba: <strong>{certificate.user.fullName}</strong>
              </p>
              <p className="text-zinc-700">
                Kurs: <strong>{certificate.course.title}</strong>
              </p>
              <p className="text-zinc-700">
                Kategoriya: <strong>{certificate.course.category}</strong>
              </p>
              <p className="text-zinc-700">
                Final score: <strong>{certificate.finalScore}%</strong>
              </p>
              <p className="text-sm text-zinc-500">
                Berilgan sana: {new Date(certificate.issuedAt).toLocaleDateString("uz-UZ")}
              </p>
            </>
          ) : (
            <div className="rounded-lg border bg-red-50 p-4 text-red-700">Sertifikat topilmadi yoki haqiqiy emas.</div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
