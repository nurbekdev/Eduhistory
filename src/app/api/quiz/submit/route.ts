import { AttemptStatus, EnrollmentStatus, ProgressStatus } from "@prisma/client";
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
      selectedOptionIds: z.array(z.string()),
    }),
  ),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = submitSchema.safeParse(payload);
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

  const answerMap = new Map(parsed.data.answers.map((a) => [a.questionId, a.selectedOptionIds.sort()]));
  let correctCount = 0;

  for (const question of attempt.quiz.questions) {
    const selected = answerMap.get(question.id) ?? [];
    const correctOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();
    if (JSON.stringify(selected) === JSON.stringify(correctOptionIds)) {
      correctCount += 1;
    }
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
        const correctOptionIds = question?.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id)
          .sort();
        const selected = [...answer.selectedOptionIds].sort();

        return {
          attemptId: attempt.id,
          questionId: answer.questionId,
          selectedOptionIds: selected,
          isCorrect: JSON.stringify(selected) === JSON.stringify(correctOptionIds ?? []),
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
