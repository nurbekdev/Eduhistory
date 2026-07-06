import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type StudentsListFilters = {
  progress?: "all" | "completed" | "in_progress";
};

type StudentSummaryRow = {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userImageUrl: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  enrolledAt: Date;
  completedAt: Date | null;
  totalLessons: number | bigint | null;
  completedLessons: number | bigint | null;
  lastLessonTitle: string | null;
  lastCompletedAt: Date | null;
  attemptCount: number | bigint | null;
  quizAvgPercent: number | null;
};

function normalizeCount(value: number | bigint | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const progressParam = searchParams.get("progress");
  const progressFilter: StudentsListFilters["progress"] =
    progressParam === "completed" || progressParam === "in_progress" ? progressParam : "all";
  const attemptsFor = searchParams.get("attemptsFor");

  const instructorWhere =
    session.user.role === Role.INSTRUCTOR
      ? Prisma.sql`AND co."instructorId" = ${session.user.id}`
      : Prisma.empty;

  if (attemptsFor) {
    const enrollment = await prisma.enrollment.findFirst({
      where:
        session.user.role === Role.ADMIN
          ? { id: attemptsFor }
          : { id: attemptsFor, course: { instructorId: session.user.id } },
      select: { id: true, userId: true, courseId: true },
    });

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment topilmadi." }, { status: 404 });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: enrollment.userId,
        quiz: { courseId: enrollment.courseId },
      },
      select: {
        id: true,
        scorePercent: true,
        status: true,
        attemptNumber: true,
        submittedAt: true,
        quiz: { select: { title: true, isFinal: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      attempts: attempts.map((a) => ({
        id: a.id,
        quizTitle: a.quiz.title,
        isFinal: a.quiz.isFinal,
        attemptNumber: a.attemptNumber,
        scorePercent: a.scorePercent,
        status: a.status,
        submittedAt: a.submittedAt?.toISOString() ?? null,
      })),
    });
  }

  const summaryRows = await prisma.$queryRaw<StudentSummaryRow[]>`
    SELECT
      e.id,
      e."userId",
      u."fullName" AS "userFullName",
      u.email AS "userEmail",
      u."imageUrl" AS "userImageUrl",
      e."courseId",
      co.title AS "courseTitle",
      co.slug AS "courseSlug",
      e.status::text AS status,
      e."enrolledAt",
      e."completedAt",
      COALESCE(lesson_counts."totalLessons", 0)::int AS "totalLessons",
      COALESCE(progress_counts."completedLessons", 0)::int AS "completedLessons",
      last_progress."lessonTitle" AS "lastLessonTitle",
      last_progress."completedAt" AS "lastCompletedAt",
      COALESCE(attempt_stats."attemptCount", 0)::int AS "attemptCount",
      attempt_stats."quizAvgPercent" AS "quizAvgPercent"
    FROM "Enrollment" e
    JOIN "User" u ON u.id = e."userId"
    JOIN "Course" co ON co.id = e."courseId"
    LEFT JOIN (
      SELECT m."courseId", COUNT(l.id)::int AS "totalLessons"
      FROM "Module" m
      LEFT JOIN "Lesson" l ON l."moduleId" = m.id
      GROUP BY m."courseId"
    ) lesson_counts ON lesson_counts."courseId" = e."courseId"
    LEFT JOIN (
      SELECT
        lp."enrollmentId",
        COUNT(*) FILTER (WHERE lp.status = 'COMPLETED')::int AS "completedLessons"
      FROM "LessonProgress" lp
      GROUP BY lp."enrollmentId"
    ) progress_counts ON progress_counts."enrollmentId" = e.id
    LEFT JOIN (
      SELECT DISTINCT ON (lp."enrollmentId")
        lp."enrollmentId",
        l.title AS "lessonTitle",
        lp."completedAt"
      FROM "LessonProgress" lp
      JOIN "Lesson" l ON l.id = lp."lessonId"
      WHERE lp."completedAt" IS NOT NULL
      ORDER BY lp."enrollmentId", lp."completedAt" DESC
    ) last_progress ON last_progress."enrollmentId" = e.id
    LEFT JOIN (
      SELECT
        qa."userId",
        q."courseId",
        COUNT(*)::int AS "attemptCount",
        AVG(qa."scorePercent") AS "quizAvgPercent"
      FROM "QuizAttempt" qa
      JOIN "Quiz" q ON q.id = qa."quizId"
      GROUP BY qa."userId", q."courseId"
    ) attempt_stats ON attempt_stats."userId" = e."userId" AND attempt_stats."courseId" = e."courseId"
    WHERE 1 = 1
    ${instructorWhere}
    ORDER BY e."enrolledAt" DESC
  `;

  const rows = summaryRows.map((row) => {
    const totalLessons = normalizeCount(row.totalLessons);
    const completedLessons = normalizeCount(row.completedLessons);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: row.id,
      userId: row.userId,
      userFullName: row.userFullName,
      userEmail: row.userEmail,
      userImageUrl: row.userImageUrl ?? null,
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      status: row.status,
      enrolledAt: row.enrolledAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      progressPercent,
      completedLessons,
      totalLessons,
      lastLessonTitle: row.lastLessonTitle ?? null,
      lastCompletedAt: row.lastCompletedAt?.toISOString() ?? null,
      attemptCount: normalizeCount(row.attemptCount),
      quizAvgPercent: row.quizAvgPercent != null ? Math.round(row.quizAvgPercent * 10) / 10 : null,
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
