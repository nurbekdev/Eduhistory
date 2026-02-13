import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificateShareBlock } from "@/features/certificates/components/certificate-share-block";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, XCircle } from "lucide-react";

type VerifyCertificatePageProps = {
  params: Promise<{ uuid: string }>;
};

function getVerifyUrl(uuid: string) {
  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
  return `${base.replace(/\/$/, "")}/sertifikat/${uuid}`;
}

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
    <PageContainer className="flex min-h-[60vh] items-center justify-center py-12">
      <Card className="mx-auto w-full max-w-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-xl">
        {isValid && certificate ? (
          <>
            <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-8 text-white dark:border-slate-700">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="size-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Sertifikat haqiqiy</h1>
                <p className="text-sm text-emerald-100">
                  Ushbu sertifikat Eduhistory tizimida ro‘yxatdan o‘tgan va tekshiruvdan o‘tgan.
                </p>
              </div>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sertifikat ma’lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-slate-50/50 p-4">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Talaba</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{certificate.user.fullName}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Kurs</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{certificate.course.title}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Kategoriya</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{certificate.course.category}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Final ball</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{certificate.finalScore}%</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Berilgan sana</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {new Date(certificate.issuedAt).toLocaleDateString("uz-UZ", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">Tekshiruv ID: {uuid}</p>
              <CertificateShareBlock uuid={uuid} verifyUrl={getVerifyUrl(uuid)} />
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Bosh sahifaga</Link>
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <div className="border-b bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-white">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/20">
                  <XCircle className="size-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Sertifikat topilmadi</h1>
                <p className="text-sm text-red-100">
                  Ushbu havola yoki QR kod noto‘g‘ri yoki sertifikat tizimda mavjud emas.
                </p>
              </div>
            </div>
            <CardContent className="space-y-4 pt-6">
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                Sertifikat haqiqiyligini tekshirish uchun faqat original PDF dagi QR kodni skanerlang yoki
                Eduhistory dan olingan havolani ishlating.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Bosh sahifaga</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
