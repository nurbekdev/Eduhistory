import { AttemptStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Seeded Fisher-Yates shuffle — same attemptId always gives same order */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  // Simple hash from seed string
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const rng = () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0x100000000;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sanitizedQuestionMetadata(type: string, metadata: unknown, seed: string): unknown {
  if (!metadata || typeof metadata !== "object") return undefined;

  if (type === "MATCHING") {
    const pairs = ((metadata as { pairs?: { left: string; right: string }[] }).pairs ?? [])
      .map((pair) => ({
        left: String(pair.left ?? ""),
        right: String(pair.right ?? ""),
      }))
      .filter((pair) => pair.left || pair.right);

    return {
      leftItems: pairs.map((pair) => pair.left),
      rightItems: seededShuffle(pairs.map((pair) => pair.right), `${seed}:matching-right`),
    };
  }

  if (type === "CLOZE") {
    const parts = ((metadata as { parts?: { type: string; value: string }[] }).parts ?? []).map((part) => ({
      type: part.type,
      value: part.type === "blank" ? "" : String(part.value ?? ""),
    }));
    return { parts };
  }

  if (type === "NUMERICAL") return undefined;

  return metadata;
}

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
              instructorId: true,
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
    attempt.userId === session.user.id ||
    session.user.role === Role.ADMIN ||
    (session.user.role === Role.INSTRUCTOR && attempt.quiz.course.instructorId === session.user.id);
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
      course: {
        id: attempt.quiz.course.id,
        title: attempt.quiz.course.title,
      },
      questions: seededShuffle(attempt.quiz.questions, attempt.id).map((question, qi) => ({
        id: question.id,
        text: question.text,
        explanation: attempt.status === AttemptStatus.IN_PROGRESS ? null : question.explanation,
        type: question.type,
        metadata:
          attempt.status === AttemptStatus.IN_PROGRESS
            ? sanitizedQuestionMetadata(question.type, question.metadata, `${attempt.id}-${qi}`)
            : question.metadata ?? undefined,
        options: seededShuffle(question.options, `${attempt.id}-${qi}`).map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    },
  });
}
