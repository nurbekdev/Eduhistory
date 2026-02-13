import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type StudentsListFilters = {
  progress?: "all" | "completed" | "in_progress";
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const progressFilter = searchParams.get("progress") ?? "all";

  const enrollments = await prisma.enrollment.findMany({
    where:
      session.user.role === Role.ADMIN
        ? {}
        : { course: { instructorId: session.user.id } },
    include: {
      user: { select: { id: true, fullName: true, email: true, imageUrl: true } },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          modules: {
            include: {
              _count: { select: { lessons: true } },
            },
          },
        },
      },
      progress: {
        select: {
          lessonId: true,
          status: true,
          completedAt: true,
          lastAttemptScore: true,
          lesson: { select: { title: true, order: true } },
        },
      },
      attempts: {
        select: {
          id: true,
          scorePercent: true,
          status: true,
          attemptNumber: true,
          submittedAt: true,
          quiz: { select: { title: true, isFinal: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const totalLessonsByCourse = new Map<string, number>();
  for (const e of enrollments) {
    if (!totalLessonsByCourse.has(e.courseId)) {
      const total = e.course.modules.reduce((acc, m) => acc + m._count.lessons, 0);
      totalLessonsByCourse.set(e.courseId, total);
    }
  }

  const rows = enrollments.map((e) => {
    const totalLessons = totalLessonsByCourse.get(e.courseId) ?? 0;
    const completedLessons = e.progress.filter((p) => p.status === "COMPLETED").length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const lastProgress = e.progress
      .filter((p) => p.completedAt)
      .sort((a, b) => (b.completedAt!.getTime() ?? 0) - (a.completedAt!.getTime() ?? 0))[0];
    const avgQuiz =
      e.attempts.length > 0
        ? e.attempts.reduce((acc, a) => acc + a.scorePercent, 0) / e.attempts.length
        : null;

    return {
      id: e.id,
      userId: e.user.id,
      userFullName: e.user.fullName,
      userEmail: e.user.email,
      userImageUrl: e.user.imageUrl ?? null,
      courseId: e.course.id,
      courseTitle: e.course.title,
      courseSlug: e.course.slug,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      progressPercent,
      completedLessons,
      totalLessons,
      lastLessonTitle: lastProgress?.lesson?.title ?? null,
      lastCompletedAt: lastProgress?.completedAt?.toISOString() ?? null,
      attemptCount: e.attempts.length,
      quizAvgPercent: avgQuiz != null ? Math.round(avgQuiz * 10) / 10 : null,
      attempts: e.attempts.map((a) => ({
        id: a.id,
        quizTitle: a.quiz.title,
        isFinal: a.quiz.isFinal,
        attemptNumber: a.attemptNumber,
        scorePercent: a.scorePercent,
        status: a.status,
        submittedAt: a.submittedAt?.toISOString() ?? null,
      })),
    };
  });

  let filtered = rows;
  if (progressFilter === "completed") {
    filtered = rows.filter((r) => r.progressPercent >= 100 || r.completedAt);
  } else if (progressFilter === "in_progress") {
    filtered = rows.filter((r) => r.progressPercent < 100 && !r.completedAt);
  }

  return NextResponse.json({ rows: filtered });
}
