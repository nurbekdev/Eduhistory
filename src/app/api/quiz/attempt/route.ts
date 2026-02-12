import { AttemptStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const startAttemptSchema = z.object({
  quizId: z.string().min(1),
  enrollmentId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = startAttemptSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Quiz urinish ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: parsed.data.quizId },
    include: {
      lesson: true,
    },
  });
  if (!quiz) {
    return NextResponse.json({ message: "Quiz topilmadi." }, { status: 404 });
  }

  if (quiz.lessonId && !parsed.data.enrollmentId) {
    return NextResponse.json({ message: "Dars testi uchun enrollment ma'lumoti kerak." }, { status: 400 });
  }

  if (parsed.data.enrollmentId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parsed.data.enrollmentId },
      include: {
        progress: true,
      },
    });
    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ message: "Enrollment topilmadi." }, { status: 404 });
    }

    if (quiz.lessonId) {
      const lessonProgress = enrollment.progress.find((item) => item.lessonId === quiz.lessonId);
      if (!lessonProgress || lessonProgress.status === "LOCKED") {
        return NextResponse.json({ message: "Bu dars hali qulflangan. Avval oldingi testdan o'ting." }, { status: 403 });
      }

      if (lessonProgress.status === "COMPLETED") {
        return NextResponse.json({ message: "Bu dars testidan allaqachon o'tgansiz." }, { status: 409 });
      }
    }

    if (quiz.isFinal) {
      const unfinishedCount = enrollment.progress.filter((item) => item.status !== "COMPLETED").length;
      if (unfinishedCount > 0) {
        return NextResponse.json(
          { message: "Yakuniy testni boshlash uchun barcha dars testlaridan o'tishingiz kerak." },
          { status: 403 },
        );
      }

      const passedFinal = await prisma.quizAttempt.findFirst({
        where: {
          quizId: quiz.id,
          userId: session.user.id,
          status: AttemptStatus.PASSED,
        },
      });
      if (passedFinal) {
        return NextResponse.json({ message: "Siz yakuniy testdan allaqachon o'tgansiz." }, { status: 409 });
      }
    }
  }

  const activeAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId: parsed.data.quizId,
      userId: session.user.id,
      status: AttemptStatus.IN_PROGRESS,
    },
    orderBy: { createdAt: "desc" },
  });
  if (activeAttempt) {
    const timeLimitMinutes = quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes : 20;
    const elapsedSeconds = Math.floor((Date.now() - new Date(activeAttempt.startedAt).getTime()) / 1000);
    const isExpired = elapsedSeconds >= timeLimitMinutes * 60;

    if (!isExpired) {
      return NextResponse.json(activeAttempt);
    }

    await prisma.quizAttempt.update({
      where: { id: activeAttempt.id },
      data: {
        status: AttemptStatus.FAILED,
        submittedAt: new Date(),
        durationSeconds: elapsedSeconds,
      },
    });
  }

  const attemptsCount = await prisma.quizAttempt.count({
    where: {
      quizId: parsed.data.quizId,
      userId: session.user.id,
      status: {
        in: [AttemptStatus.PASSED, AttemptStatus.FAILED],
      },
    },
  });

  if (attemptsCount >= quiz.attemptLimit) {
    return NextResponse.json(
      {
        message: `Urinish limiti tugagan. Maksimal urinishlar soni: ${quiz.attemptLimit}.`,
      },
      { status: 409 },
    );
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: parsed.data.quizId,
      userId: session.user.id,
      enrollmentId: parsed.data.enrollmentId,
      attemptNumber: attemptsCount + 1,
      status: AttemptStatus.IN_PROGRESS,
    },
  });

  return NextResponse.json(attempt, { status: 201 });
}
