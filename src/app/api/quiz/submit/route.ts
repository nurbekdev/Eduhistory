import { AttemptStatus, EnrollmentStatus, ProgressStatus, QuestionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { generateCertificateForPassedFinalAttempt } from "@/lib/certificate-service";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.union([z.array(z.string()), z.any()]),
    }),
  ),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON noto'g'ri yoki bo'sh." }, { status: 400 });
  }

  let parsed: { success: true; data: z.infer<typeof submitSchema> } | { success: false; error: z.ZodError };
  try {
    parsed = submitSchema.safeParse(payload) as typeof parsed;
  } catch (err) {
    console.error("Quiz submit schema parse error:", err);
    return NextResponse.json({ message: "Javob formati noto'g'ri." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ message: "Javob formati noto'g'ri." }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parsed.data.attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ message: "Urinish topilmadi." }, { status: 404 });
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return NextResponse.json({ message: "Bu urinish allaqachon yakunlangan." }, { status: 409 });
  }

  const answerMap = new Map(
    parsed.data.answers.map((a) => [
      a.questionId,
      Array.isArray(a.selectedOptionIds) ? [...a.selectedOptionIds].sort() : a.selectedOptionIds,
    ])
  );

  function isQuestionCorrect(
    question: { type: string; options: { id: string; isCorrect: boolean }[]; metadata?: unknown },
    answer: unknown
  ): boolean {
    const optionBased = [QuestionType.MULTIPLE_CHOICE, QuestionType.MULTIPLE_SELECT, QuestionType.TRUE_FALSE];
    if (optionBased.includes(question.type as QuestionType)) {
      const selected = Array.isArray(answer) ? (answer as string[]).sort() : [];
      const correctIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort();
      return JSON.stringify(selected) === JSON.stringify(correctIds);
    }
    if (question.type === QuestionType.NUMERICAL) {
      const meta = question.metadata as { correct?: number; tolerance?: number } | null;
      const correct = meta?.correct ?? 0;
      const tolerance = Math.abs(meta?.tolerance ?? 0);
      const userNum = typeof answer === "object" && answer !== null && "number" in answer ? Number((answer as { number: number }).number) : Number(answer);
      if (!Number.isFinite(userNum)) return false;
      return Math.abs(userNum - correct) <= tolerance;
    }
    if (question.type === QuestionType.MATCHING) {
      const meta = question.metadata as { pairs?: { left: string; right: string }[] } | null;
      const correctPairs = (meta?.pairs ?? []).map((p) => `${p.left}\t${p.right}`).sort().join("\n");
      const userPairs = typeof answer === "object" && answer !== null && "pairs" in answer
        ? (answer as { pairs: { left: string; right: string }[] }).pairs.map((p) => `${p.left}\t${p.right}`).sort().join("\n")
        : "";
      return correctPairs === userPairs;
    }
    if (question.type === QuestionType.CLOZE) {
      const meta = question.metadata as { parts?: { type: string; value: string }[] } | null;
      const correctBlanks = (meta?.parts ?? []).filter((p) => p.type === "blank").map((p) => (p.value ?? "").trim().toLowerCase());
      const userBlanks = typeof answer === "object" && answer !== null && "blanks" in answer
        ? ((answer as { blanks: string[] }).blanks ?? []).map((b) => String(b).trim().toLowerCase())
        : [];
      if (correctBlanks.length !== userBlanks.length) return false;
      return correctBlanks.every((c, i) => c === (userBlanks[i] ?? ""));
    }
    return false;
  }

  let correctCount = 0;
  for (const question of attempt.quiz.questions) {
    const answer = answerMap.get(question.id);
    if (isQuestionCorrect(question, answer)) correctCount += 1;
  }

  const totalQuestions = attempt.quiz.questions.length || 1;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const isPassed = scorePercent >= attempt.quiz.passingScore;
  let certificate:
    | {
        id: string;
        uuid: string;
        pdfUrl: string | null;
      }
    | undefined;

  await prisma.$transaction(async (tx) => {
    await tx.attemptAnswer.deleteMany({
      where: { attemptId: attempt.id },
    });

    await tx.attemptAnswer.createMany({
      data: parsed.data.answers.map((answer) => {
        const question = attempt.quiz.questions.find((q) => q.id === answer.questionId);
        const rawAnswer = Array.isArray(answer.selectedOptionIds)
          ? [...answer.selectedOptionIds].sort()
          : answer.selectedOptionIds;
        const isCorrect = question ? isQuestionCorrect(question, rawAnswer) : false;
        return {
          attemptId: attempt.id,
          questionId: answer.questionId,
          selectedOptionIds: rawAnswer,
          isCorrect,
        };
      }),
    });

    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        scorePercent,
        correctCount,
        wrongCount: totalQuestions - correctCount,
        submittedAt: new Date(),
        status: isPassed ? AttemptStatus.PASSED : AttemptStatus.FAILED,
      },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: { coins: { increment: correctCount } },
    });

    if (attempt.quiz.lessonId && attempt.enrollmentId) {
      await tx.lessonProgress.updateMany({
        where: {
          enrollmentId: attempt.enrollmentId,
          lessonId: attempt.quiz.lessonId,
        },
        data: {
          attemptsUsed: { increment: 1 },
          lastAttemptScore: scorePercent,
          status: isPassed ? ProgressStatus.COMPLETED : ProgressStatus.UNLOCKED,
          completedAt: isPassed ? new Date() : null,
        },
      });

      if (isPassed) {
        const orderedLessons = await tx.lesson.findMany({
          where: {
            module: {
              courseId: attempt.quiz.courseId,
            },
          },
          select: {
            id: true,
          },
          orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
        });

        const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === attempt.quiz.lessonId);
        const nextLessonId = currentIndex >= 0 ? orderedLessons[currentIndex + 1]?.id : undefined;

        if (nextLessonId) {
          await tx.lessonProgress.updateMany({
            where: {
              enrollmentId: attempt.enrollmentId,
              lessonId: nextLessonId,
              status: ProgressStatus.LOCKED,
            },
            data: {
              status: ProgressStatus.UNLOCKED,
              unlockedAt: new Date(),
            },
          });
        }
      }
    }

    if (attempt.quiz.isFinal && isPassed) {
      const enrollmentId =
        attempt.enrollmentId ??
        (
          await tx.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId: session.user.id,
                courseId: attempt.quiz.courseId,
              },
            },
            select: { id: true },
          })
        )?.id;

      if (enrollmentId) {
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            status: EnrollmentStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }
    }
  });

  if (attempt.quiz.isFinal && isPassed) {
    try {
      const generated = await generateCertificateForPassedFinalAttempt({
        attemptId: attempt.id,
        expectedUserId: session.user.id,
        generatedBy: "api/quiz/submit",
      });
      certificate = {
        id: generated.id,
        uuid: generated.uuid,
        pdfUrl: generated.pdfUrl,
      };
    } catch (error) {
      console.error("Sertifikat avtomatik yaratilmadi:", error);
    }
  }

  return NextResponse.json({
    scorePercent,
    correctCount,
    totalQuestions,
    passed: isPassed,
    certificate,
  });
}
