import { NextResponse } from "next/server";
import { AttemptStatus, EnrollmentStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { courseId } = await context.params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }
  if (session.user.role === Role.INSTRUCTOR && course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu kurs analitikasiga ruxsat yo'q." }, { status: 403 });
  }

  const [enrolledCount, completionCount, quizScoreAgg, finalAttemptStatusCounts] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.enrollment.count({ where: { courseId, status: EnrollmentStatus.COMPLETED } }),
    prisma.quizAttempt.aggregate({
      where: { quiz: { courseId } },
      _avg: { scorePercent: true },
    }),
    prisma.quizAttempt.groupBy({
      by: ["status"],
      where: { quiz: { courseId, isFinal: true } },
      _count: { _all: true },
    }),
  ]);

  const finalAttemptTotal = finalAttemptStatusCounts.reduce((sum, item) => sum + item._count._all, 0);
  const finalPassed = finalAttemptStatusCounts.find((item) => item.status === AttemptStatus.PASSED)?._count._all ?? 0;
  const finalPassRate = finalAttemptTotal
    ? (finalPassed / finalAttemptTotal) * 100
    : 0;

  return NextResponse.json({
    enrolledCount,
    completionRate: enrolledCount ? (completionCount / enrolledCount) * 100 : 0,
    averageQuizScore: Number((quizScoreAgg._avg.scorePercent ?? 0).toFixed(2)),
    finalPassRate: Number(finalPassRate.toFixed(2)),
  });
}
