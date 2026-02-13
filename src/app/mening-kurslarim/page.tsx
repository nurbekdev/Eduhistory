import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RestartCourseButton } from "@/features/courses/components/restart-course-button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getCourseCover(category: string, coverImageUrl?: string | null) {
  if (coverImageUrl?.startsWith("http") || coverImageUrl?.startsWith("/")) return coverImageUrl;
  const lower = category.toLowerCase();
  if (lower.includes("robot")) return "/images/robotics.jpg";
  if (lower.includes("it")) return "/images/it.jpg";
  if (lower.includes("3d")) return "/images/3d.jpg";
  return "/images/it.jpg";
}

export default async function MyCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        include: {
          instructor: { select: { fullName: true } },
          modules: { include: { lessons: true } },
        },
      },
      progress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Mening kurslarim"
        description="Yozilgan kurslar va progress holatlari."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {enrollments.length === 0 ? (
          <Card className="md:col-span-2 dark:border-slate-700">
            <CardContent className="p-8 text-center text-slate-600 dark:text-slate-400">
              Siz hali hech bir kursga yozilmagansiz.
              <Button asChild className="mt-4">
                <Link href="/kurslar">Kurslar katalogi</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce(
              (acc, m) => acc + m.lessons.length,
              0
            );
            const completed = enrollment.progress.filter((p) => p.status === "COMPLETED").length;
            const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
            const isCompleted = enrollment.status === "COMPLETED";
            const coverSrc = getCourseCover(
              enrollment.course.category,
              enrollment.course.coverImageUrl
            );
            const isExternalCover = coverSrc.startsWith("http");

            return (
              <Card
                key={enrollment.id}
                className="overflow-hidden dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="relative h-40 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {isExternalCover ? (
                    <img
                      src={coverSrc}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={coverSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-900/40 backdrop-blur">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  {isCompleted && (
                    <Badge className="absolute right-2 top-2 bg-emerald-600">Tugatilgan</Badge>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg dark:text-slate-100">
                      {enrollment.course.title}
                    </CardTitle>
                    <Badge variant="warning">{percent}%</Badge>
                  </div>
                  <CardDescription className="line-clamp-2 dark:text-slate-400">
                    {enrollment.course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <p>Ustoz: {enrollment.course.instructor.fullName}</p>
                  <p>
                    {completed} / {totalLessons} dars
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button asChild className="flex-1 sm:flex-none">
                    <Link href={`/player/${enrollment.course.id}`}>
                      {isCompleted ? "Kursni ko'rish" : "Davom ettirish"}
                    </Link>
                  </Button>
                  {isCompleted && (
                    <RestartCourseButton
                      enrollmentId={enrollment.id}
                      courseId={enrollment.course.id}
                    />
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
