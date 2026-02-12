import { notFound } from "next/navigation";
import { CourseLevel, CourseStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrollButton } from "@/features/courses/components/enroll-button";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

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
                select: {
                  id: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          enrollments: true,
        },
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
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
      })
    : null;

  const levelMap: Record<CourseLevel, string> = {
    BEGINNER: "Boshlang'ich",
    INTERMEDIATE: "O'rta",
    ADVANCED: "Yuqori",
  };

  return (
    <PageContainer className="space-y-6">
      <div className="space-y-3 rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{course.category}</Badge>
          <Badge variant="warning">{levelMap[course.level]}</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{course.title}</h1>
        <p className="text-zinc-600">
          {course.description}
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
          <span>Ustoz: {course.instructor.fullName}</span>
          <span>Davomiylik: {course.durationMinutes} daqiqa</span>
          <span>Talabalar: {course._count.enrollments}</span>
        </div>
        <EnrollButton courseId={course.id} initiallyEnrolled={Boolean(enrollment)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kurs outline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          {course.modules.map((moduleItem) => (
            <div key={moduleItem.id} className="rounded-lg border p-3">
              <p className="font-semibold">
                {moduleItem.order}-modul: {moduleItem.title}
              </p>
              <p className="mt-1 text-xs text-zinc-600">{moduleItem.description}</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {moduleItem.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    {lesson.order}. {lesson.title} {lesson.quiz ? "(test bilan)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
