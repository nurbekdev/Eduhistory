import Image from "next/image";
import { notFound } from "next/navigation";
import { BookCheck, Clock3, Layers3, User } from "lucide-react";
import { CourseLevel, CourseStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseReviewsSection } from "@/features/courses/components/course-reviews-section";
import { EnrollButton } from "@/features/courses/components/enroll-button";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function getCourseCover(category: string, coverImageUrl?: string | null) {
  if (coverImageUrl?.startsWith("http") || coverImageUrl?.startsWith("/")) return coverImageUrl;
  const lower = category.toLowerCase();
  if (lower.includes("robot")) return "/images/robotics.jpg";
  if (lower.includes("it")) return "/images/it.jpg";
  if (lower.includes("3d")) return "/images/3d.jpg";
  return "/images/it.jpg";
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const session = await getServerSession(authOptions);
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: {
        select: { fullName: true },
      },
      modules: {
        include: {
          lessons: {
            where: { isPublished: true },
            include: {
              quiz: {
                select: { id: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });
  if (!course) return notFound();

  if (
    course.status !== CourseStatus.PUBLISHED &&
    session?.user?.role !== Role.ADMIN &&
    session?.user?.role !== Role.INSTRUCTOR
  ) {
    return notFound();
  }

  const enrollment = session?.user?.id
    ? await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: session.user.id, courseId: course.id },
        },
      })
    : null;

  const levelMap: Record<CourseLevel, string> = {
    BEGINNER: "Boshlang'ich",
    INTERMEDIATE: "O'rta",
    ADVANCED: "Yuqori",
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const coverSrc = getCourseCover(course.category, course.coverImageUrl);
  const isExternalCover = coverSrc.startsWith("http");

  return (
    <PageContainer className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-xl">
        <div className="relative h-56 sm:h-72 md:h-80">
          {isExternalCover ? (
            <img
              src={coverSrc}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <Image
              src={coverSrc}
              alt=""
              fill
              className="object-cover opacity-90"
              priority
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/30 bg-white/20 text-white backdrop-blur">
                {course.category}
              </Badge>
              <Badge variant="warning" className="bg-emerald-500/90 text-white border-0">
                {levelMap[course.level]}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {course.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats + CTA */}
      <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1.5">
            <Layers3 className="size-4" />
            {totalLessons} dars
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1.5">
            <Clock3 className="size-4" />
            {Math.round(course.durationMinutes / 60)} soat
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1.5">
            <User className="size-4" />
            {course.instructor.fullName}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
            <BookCheck className="size-4" />
            {course._count.enrollments} talaba
          </span>
        </div>
        <EnrollButton courseId={course.id} initiallyEnrolled={Boolean(enrollment)} />
      </div>

      {/* Description */}
      <Card className="dark:border-slate-700 dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Kurs haqida</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">
            {course.description}
          </p>
        </CardContent>
      </Card>

      {/* Outline */}
      <Card className="dark:border-slate-700 dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Kurs tarkibi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.modules.map((moduleItem) => (
            <div
              key={moduleItem.id}
              className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {moduleItem.order}. {moduleItem.title}
              </p>
              {moduleItem.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {moduleItem.description}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {moduleItem.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span className="text-slate-400 dark:text-slate-500">{lesson.order}.</span>
                    {lesson.title}
                    {lesson.quiz && (
                      <Badge variant="warning" className="text-xs">Test</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <CourseReviewsSection courseId={course.id} isEnrolled={Boolean(enrollment)} />
    </PageContainer>
  );
}
