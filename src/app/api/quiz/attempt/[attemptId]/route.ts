import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { attemptId } = await context.params;
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          questions: {
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ message: "Urinish topilmadi." }, { status: 404 });
  }

  const canView =
    attempt.userId === session.user.id || session.user.role === Role.ADMIN || session.user.role === Role.INSTRUCTOR;
  if (!canView) {
    return NextResponse.json({ message: "Bu urinishni ko'rishga ruxsat yo'q." }, { status: 403 });
  }

  const safeTimeLimitMinutes =
    attempt.quiz.timeLimitMinutes && attempt.quiz.timeLimitMinutes > 0 ? attempt.quiz.timeLimitMinutes : 20;

  const totalSeconds = safeTimeLimitMinutes * 60;
  const now = Date.now();
  const startedAtMs = new Date(attempt.startedAt).getTime();
  const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
  const remainingSeconds = attempt.status === "IN_PROGRESS" ? Math.max(0, totalSeconds - elapsedSeconds) : undefined;

  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    scorePercent: attempt.scorePercent,
    ...(remainingSeconds !== undefined && { remainingSeconds }),
    quiz: {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
      description: attempt.quiz.description,
      isFinal: attempt.quiz.isFinal,
      passingScore: attempt.quiz.passingScore,
      attemptLimit: attempt.quiz.attemptLimit,
      timeLimitMinutes: safeTimeLimitMinutes,
      course: attempt.quiz.course,
      questions: attempt.quiz.questions.map((question) => ({
        id: question.id,
        text: question.text,
        explanation: question.explanation,
        type: question.type,
        metadata: question.metadata ?? undefined,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    },
  });
}
