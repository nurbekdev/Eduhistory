import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgressStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{ enrollmentId: string }>;
};

/** POST: reset progress and restart course (delete progress, certificate; set enrollment to ACTIVE; recreate first lesson UNLOCKED) */
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { enrollmentId } = await context.params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true },
  });

  if (!enrollment || enrollment.userId !== session.user.id) {
    return NextResponse.json({ message: "Yozilish topilmadi." }, { status: 404 });
  }

  const course = await prisma.course.findUnique({
    where: { id: enrollment.courseId },
    include: {
      modules: {
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  const orderedLessons = course?.modules.flatMap((m) => m.lessons) ?? [];

  await prisma.$transaction([
    prisma.lessonProgress.deleteMany({
      where: { enrollmentId },
    }),
    prisma.quizAttempt.deleteMany({
      where: {
        userId: session.user.id,
        quiz: { courseId: enrollment.courseId },
      },
    }),
    prisma.certificate.deleteMany({
      where: {
        userId: session.user.id,
        courseId: enrollment.courseId,
      },
    }),
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "ACTIVE",
        completedAt: null,
      },
    }),
  ]);

  if (orderedLessons.length > 0) {
    await prisma.lessonProgress.createMany({
      data: orderedLessons.map((lesson, index) => ({
        enrollmentId,
        userId: session.user.id,
        lessonId: lesson.id,
        status: index === 0 ? ProgressStatus.UNLOCKED : ProgressStatus.LOCKED,
        unlockedAt: index === 0 ? new Date() : null,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    success: true,
    courseId: enrollment.courseId,
    message: "Kurs qayta boshlandi.",
  });
}
