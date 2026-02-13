import { AttemptStatus, Role } from "@prisma/client";
import { format, startOfWeek } from "date-fns";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toPercent(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const url = new URL(request.url);
  const selectedCourseIdParam = url.searchParams.get("courseId");

  const courses = await prisma.course.findMany({
    where: session.user.role === Role.ADMIN ? undefined : { instructorId: session.user.id },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
      modules: {
        include: {
          lessons: {
            select: { id: true, title: true, order: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          enrollments: true,
          quizzes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (courses.length === 0) {
    return NextResponse.json({
      courses: [],
      selectedCourseId: null,
      selectedCourse: null,
    });
  }

  const perCourseMetrics = await Promise.all(
    courses.map(async (course) => {
      const [completionCount, attempts, finalAttempts, reviewAgg] = await Promise.all([
        prisma.enrollment.count({
          where: { courseId: course.id, status: "COMPLETED" },
        }),
        prisma.quizAttempt.findMany({
          where: { quiz: { courseId: course.id } },
          select: { scorePercent: true },
        }),
        prisma.quizAttempt.findMany({
          where: { quiz: { courseId: course.id, isFinal: true } },
          select: { status: true },
        }),
        prisma.courseReview.aggregate({
          where: { courseId: course.id },
          _avg: { rating: true },
          _count: true,
        }),
      ]);

      const averageQuizScore = attempts.length
        ? attempts.reduce((acc, item) => acc + item.scorePercent, 0) / attempts.length
        : 0;
      const finalPassRate = finalAttempts.length
        ? (finalAttempts.filter((item) => item.status === AttemptStatus.PASSED).length / finalAttempts.length) * 100
        : 0;

      const totalLessons = course.modules.reduce((acc, moduleItem) => acc + moduleItem.lessons.length, 0);
      return {
        id: course.id,
        title: course.title,
        category: course.category,
        status: course.status,
        enrolledCount: course._count.enrollments,
        totalLessons,
        totalQuizzes: course._count.quizzes,
        completionRate: course._count.enrollments ? toPercent((completionCount / course._count.enrollments) * 100) : 0,
        averageQuizScore: toPercent(averageQuizScore),
        finalPassRate: toPercent(finalPassRate),
        averageRating: reviewAgg._avg.rating ? Number(reviewAgg._avg.rating.toFixed(2)) : null,
        reviewCount: reviewAgg._count,
      };
    }),
  );

  const selectedCourseId = selectedCourseIdParam && courses.some((course) => course.id === selectedCourseIdParam)
    ? selectedCourseIdParam
    : courses[0].id;

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  if (!selectedCourse) {
    return NextResponse.json({
      courses: perCourseMetrics,
      selectedCourseId,
      selectedCourse: null,
    });
  }

  const [progressRows, students, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: {
        enrollment: {
          courseId: selectedCourseId,
        },
      },
      select: {
        lessonId: true,
        status: true,
      },
    }),
    prisma.enrollment.findMany({
      where: { courseId: selectedCourseId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        progress: true,
        attempts: {
          where: {
            quiz: {
              courseId: selectedCourseId,
            },
          },
          select: {
            scorePercent: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.quizAttempt.findMany({
      where: {
        quiz: { courseId: selectedCourseId },
      },
      select: {
        scorePercent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const lessonMap = new Map(
    selectedCourse.modules.flatMap((moduleItem) =>
      moduleItem.lessons.map((lesson) => [
        lesson.id,
        {
          title: lesson.title,
          order: lesson.order,
          moduleTitle: moduleItem.title,
        },
      ]),
    ),
  );

  const lessonStats = new Map<
    string,
    {
      started: number;
      completed: number;
    }
  >();
  for (const row of progressRows) {
    const current = lessonStats.get(row.lessonId) ?? { started: 0, completed: 0 };
    if (row.status === "UNLOCKED" || row.status === "COMPLETED") current.started += 1;
    if (row.status === "COMPLETED") current.completed += 1;
    lessonStats.set(row.lessonId, current);
  }

  const lessonDropOff = Array.from(lessonStats.entries())
    .map(([lessonId, stats]) => {
      const lesson = lessonMap.get(lessonId);
      return {
        lessonId,
        lessonTitle: lesson?.title ?? lessonId,
        moduleTitle: lesson?.moduleTitle ?? "Noma'lum modul",
        order: lesson?.order ?? 0,
        started: stats.started,
        completed: stats.completed,
        dropOffRate: stats.started ? toPercent(((stats.started - stats.completed) / stats.started) * 100) : 0,
      };
    })
    .sort((a, b) => a.order - b.order);

  const studentsTable = students.map((enrollment) => {
    const totalLessons = enrollment.progress.length;
    const completedLessons = enrollment.progress.filter((item) => item.status === "COMPLETED").length;
    const progressPercent = totalLessons ? toPercent((completedLessons / totalLessons) * 100) : 0;
    const avgScore = enrollment.attempts.length
      ? toPercent(enrollment.attempts.reduce((acc, item) => acc + item.scorePercent, 0) / enrollment.attempts.length)
      : 0;

    const latestActive = enrollment.progress.find((item) => item.status !== "COMPLETED");
    const currentLessonTitle = latestActive ? lessonMap.get(latestActive.lessonId)?.title ?? "Aniqlanmadi" : "Kurs yakunlangan";

    return {
      userId: enrollment.user.id,
      fullName: enrollment.user.fullName,
      email: enrollment.user.email,
      status: enrollment.status,
      progressPercent,
      attemptsCount: enrollment.attempts.length,
      averageScore: avgScore,
      currentLessonTitle,
    };
  });

  const attemptsTrendMap = new Map<
    string,
    {
      date: string;
      attempts: number;
      scoreSum: number;
    }
  >();
  for (const attempt of attempts) {
    const date = attempt.createdAt.toISOString().slice(0, 10);
    const current = attemptsTrendMap.get(date) ?? { date, attempts: 0, scoreSum: 0 };
    current.attempts += 1;
    current.scoreSum += attempt.scorePercent;
    attemptsTrendMap.set(date, current);
  }
  const attemptsTrend = Array.from(attemptsTrendMap.values()).map((item) => ({
    date: item.date,
    attempts: item.attempts,
    averageScore: item.attempts ? toPercent(item.scoreSum / item.attempts) : 0,
  }));

  const completedProgress = await prisma.lessonProgress.findMany({
    where: {
      enrollment: {
        courseId: selectedCourseId,
      },
      status: "COMPLETED",
      completedAt: {
        not: null,
      },
    },
    select: {
      lessonId: true,
      completedAt: true,
    },
  });

  const weeklyCohortMap = new Map<string, Record<string, number>>();
  for (const row of completedProgress) {
    if (!row.completedAt) continue;
    const weekStart = format(startOfWeek(row.completedAt, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const current = weeklyCohortMap.get(weekStart) ?? {};
    current[row.lessonId] = (current[row.lessonId] ?? 0) + 1;
    weeklyCohortMap.set(weekStart, current);
  }

  const lessonMeta = selectedCourse.modules
    .flatMap((moduleItem) => moduleItem.lessons)
    .sort((a, b) => a.order - b.order)
    .map((lesson) => ({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    }));

  const weeklyRows = Array.from(weeklyCohortMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([week, values]) => {
      const row: Record<string, number | string> = { week };
      for (const lesson of lessonMeta) {
        row[lesson.lessonId] = values[lesson.lessonId] ?? 0;
      }
      return row as { week: string } & Record<string, number | string>;
    });

  const [recentReviews, ratingAgg] = await Promise.all([
    prisma.courseReview.findMany({
      where: { courseId: selectedCourseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.courseReview.aggregate({
      where: { courseId: selectedCourseId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const insights: string[] = [];
  const selectedMetric = perCourseMetrics.find((c) => c.id === selectedCourseId);
  if (selectedMetric) {
    if (selectedMetric.completionRate < 50) {
      insights.push(`Kursni tugatish darajasi past (${selectedMetric.completionRate}%). Talabalar uchun qo'shimcha motivatsiya yoki kontentni qisqartirishni ko'rib chiqing.`);
    }
    if (selectedMetric.averageQuizScore > 0 && selectedMetric.averageQuizScore < 70) {
      insights.push(`Quiz o'rtacha balli ${selectedMetric.averageQuizScore}%. Savol qiyinligi yoki tushuntirishlarni oshirish mumkin.`);
    }
    const worstDrop = lessonDropOff.sort((a, b) => b.dropOffRate - a.dropOffRate)[0];
    if (worstDrop && worstDrop.dropOffRate > 30) {
      insights.push(`"${worstDrop.lessonTitle}" darsida tushish eng yuqori (${worstDrop.dropOffRate}%). Kontent yoki davomiylikni tekshiring.`);
    }
    if (ratingAgg._count > 0 && ratingAgg._avg.rating && ratingAgg._avg.rating < 4) {
      insights.push(`Kurs reytingi o'rtacha ${ratingAgg._avg.rating.toFixed(1)}. Talabalar fikrlari bo'limida izohlarni o'qib, yaxshilashlar kiriting.`);
    }
  }

  return NextResponse.json({
    courses: perCourseMetrics,
    selectedCourseId,
    selectedCourse: {
      id: selectedCourse.id,
      title: selectedCourse.title,
      category: selectedCourse.category,
      lessonDropOff,
      studentsTable,
      attemptsTrend,
      weeklyCohortComparison: {
        lessons: lessonMeta,
        rows: weeklyRows,
      },
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(2)) : null,
      totalReviews: ratingAgg._count,
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        userName: r.user.fullName,
      })),
      insights,
    },
  });
}
