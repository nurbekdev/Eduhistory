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

  const [enrolledCount, completionCount, quizAttempts, finalAttempts] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.enrollment.count({ where: { courseId, status: EnrollmentStatus.COMPLETED } }),
    prisma.quizAttempt.findMany({
      where: { quiz: { courseId } },
      select: { scorePercent: true },
    }),
    prisma.quizAttempt.findMany({
      where: { quiz: { courseId, isFinal: true } },
      select: { status: true },
    }),
  ]);

  const avgScore = quizAttempts.length
    ? quizAttempts.reduce((sum, item) => sum + item.scorePercent, 0) / quizAttempts.length
    : 0;

  const finalPassRate = finalAttempts.length
    ? (finalAttempts.filter((a) => a.status === AttemptStatus.PASSED).length / finalAttempts.length) * 100
    : 0;

  return NextResponse.json({
    enrolledCount,
    completionRate: enrolledCount ? (completionCount / enrolledCount) * 100 : 0,
    averageQuizScore: Number(avgScore.toFixed(2)),
    finalPassRate: Number(finalPassRate.toFixed(2)),
  });
}
