import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";

import { ShareCertificateDrawer } from "./share-certificate-drawer";

function linkedInAddCertUrl(certUrl: string, courseTitle: string): string {
  const url = encodeURIComponent(certUrl);
  const name = encodeURIComponent(courseTitle);
  return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${name}&organizationName=Eduhistory&url=${url}`;
}

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";
  const t = getT(locale);

  const certificatesRaw = await prisma.$queryRaw<
    Array<{
      id: string;
      uuid: string;
      userId: string;
      courseId: string;
      quizAttemptId: string | null;
      pdfUrl: string | null;
      finalScore: number;
      issuedAt: Date;
      course_title: string;
      course_category: string;
    }>
  >`
    SELECT c.id, c.uuid, c."userId", c."courseId", c."quizAttemptId", c."pdfUrl", c."finalScore", c."issuedAt",
           co.title AS "course_title", co.category AS "course_category"
    FROM "Certificate" c
    JOIN "Course" co ON co.id = c."courseId"
    WHERE c."userId" = ${session.user.id}
    ORDER BY c."issuedAt" DESC
  `;
  const certificates = certificatesRaw.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    userId: row.userId,
    courseId: row.courseId,
    quizAttemptId: row.quizAttemptId,
    pdfUrl: row.pdfUrl,
    finalScore: row.finalScore,
    issuedAt: row.issuedAt,
    course: { title: row.course_title, category: row.course_category },
  }));

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "";

  return (
    <PageContainer className="space-y-8">
      <SectionTitle
        title={t("certificates.title")}
        description={t("certificates.subtitle")}
      />
      <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
        {certificates.length === 0 ? (
          <Card className="w-full">
            <CardContent className="p-8 text-center text-slate-600 dark:text-slate-400">
              <p className="text-sm">{t("certificates.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          certificates.map((certificate) => {
            const verifyUrl = `${baseUrl.replace(/\/$/, "")}/sertifikat/${certificate.uuid}`;
            const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(locale === "uz" ? "uz-UZ" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const pdfFullUrl = certificate.pdfUrl ? `${baseUrl.replace(/\/$/, "")}${certificate.pdfUrl}` : null;
            return (
              <Card key={certificate.id} className="flex w-[320px] shrink-0 flex-col overflow-hidden border-slate-200 dark:border-slate-700">
                <CardContent className="flex flex-1 flex-col p-0">
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {certificate.course.title}
                    </h3>
                  </div>
                  <div className="flex justify-center bg-slate-100 px-4 py-4 dark:bg-slate-800/50">
                    <div className="w-full max-w-[240px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
                      {pdfFullUrl ? (
                        <iframe
                          title={certificate.course.title}
                          src={`${pdfFullUrl}#view=FitH&toolbar=0&navpanes=0`}
                          className="aspect-[842/595] w-full border-0"
                        />
                      ) : (
                        <div className="flex aspect-[842/595] flex-col items-center justify-center bg-gradient-to-br from-emerald-800 to-teal-900 p-4 text-white">
                          <p className="mb-1 text-center text-xs font-medium opacity-90">
                            {certificate.course.title} kursini tamomlagani haqida
                          </p>
                          <p className="mb-2 text-center text-xl font-bold tracking-wide">SERTIFIKAT</p>
                          <p className="text-center text-xs opacity-90">
                            {certificate.finalScore}% · {issuedDate}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center gap-2 px-4 pb-2">
                    <Button asChild variant="outline" size="sm" className="rounded border-slate-300 text-xs dark:border-slate-600">
                      <Link href={`/sertifikat/${certificate.uuid}`}>QR tekshirish</Link>
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <Button asChild className="w-full bg-slate-900 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                      <a href={certificate.pdfUrl ?? "#"} target="_blank" rel="noreferrer">
                        {t("certificates.downloadButton")}
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 border-[#0a66c2] bg-[#0a66c2] text-white hover:bg-[#004182] hover:text-white dark:bg-[#0a66c2] dark:hover:bg-[#004182]">
                      <a href={linkedInAddCertUrl(verifyUrl, certificate.course.title)} target="_blank" rel="noreferrer">
                        <svg className="size-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        {t("certificates.addToLinkedIn")}
                      </a>
                    </Button>
                    <ShareCertificateDrawer
                      shareUrl={verifyUrl}
                      courseTitle={certificate.course.title}
                      shareButtonLabel={t("certificates.shareOnLinkedIn")}
                      shareLinkTitle={t("certificates.shareLinkTitle")}
                      copyLinkLabel={t("certificates.copyLink")}
                      copiedLabel={t("certificates.copied")}
                      shareToAnyLabel={t("certificates.shareToAny")}
                      shareLinkDescription={t("certificates.shareLinkDescription")}
                    />
                    <Button asChild variant="ghost" size="sm" className="w-full text-slate-600 dark:text-slate-400">
                      <Link href={`/sertifikat/${certificate.uuid}`}>{t("certificates.verify")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
