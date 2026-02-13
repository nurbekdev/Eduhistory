import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { CourseLevel, CourseStatus } from "@prisma/client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";

function getLevelMap(t: (k: string) => string): Record<CourseLevel, string> {
  return {
    BEGINNER: t("courses.levelBeginner"),
    INTERMEDIATE: t("courses.levelIntermediate"),
    ADVANCED: t("courses.levelAdvanced"),
  };
}

function getCoursePreviewImage(category: string, coverImageUrl?: string | null) {
  if (coverImageUrl && coverImageUrl.startsWith("http")) return coverImageUrl;
  if (coverImageUrl && coverImageUrl.startsWith("/")) return coverImageUrl;
  const lower = category.toLowerCase();
  if (lower.includes("robot")) return "/images/robotics.jpg";
  if (lower.includes("it")) return "/images/it.jpg";
  if (lower.includes("3d")) return "/images/3d.jpg";
  return "/images/it.jpg";
}

function CourseCoverImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const isExternal = src.startsWith("http");
  const className = "h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]";
  if (isExternal) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
    />
  );
}

export default async function CoursesPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";
  const t = getT(locale);
  const levelMap = getLevelMap(t);

  const courses = await prisma.course.findMany({
    where: {
      status: CourseStatus.PUBLISHED,
    },
    include: {
      instructor: {
        select: { fullName: true },
      },
      _count: {
        select: {
          enrollments: true,
          modules: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <PageContainer>
      <SectionTitle
        title={t("courses.title")}
        description={t("courses.subtitle")}
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {courses.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">{t("courses.empty")}</CardContent>
          </Card>
        ) : (
          courses.map((course) => (
            <Card key={course.id} className="group overflow-hidden">
              <div className="relative h-44 w-full overflow-hidden">
                <CourseCoverImage
                  src={getCoursePreviewImage(course.category, course.coverImageUrl)}
                  alt={`${course.title} rasmi`}
                />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge>{course.category}</Badge>
                  <Badge variant="warning">{levelMap[course.level]}</Badge>
                </div>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <p>{t("courses.instructor")}: {course.instructor.fullName}</p>
                <p>{t("courses.duration")}: {course.durationMinutes} min</p>
                <p>{t("courses.modules")}: {course._count.modules}</p>
                <p>{t("courses.enrollments")}: {course._count.enrollments}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/kurslar/${course.slug}`}>{t("courses.detail")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
