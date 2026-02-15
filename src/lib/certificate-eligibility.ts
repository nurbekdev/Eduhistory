import { prisma } from "@/lib/prisma";

/**
 * Talaba sertifikat olishga haqli ekanligini tekshiradi.
 * Qoida:
 * 1. Barcha darslar tugallangan bo'lishi kerak (shu enrollment bo'yicha).
 * 2. Yakuniy test yo'q yoki savollar yo'q yoki ixtiyoriy (isOptional) yoki o'tilgan bo'lishi kerak.
 */
export async function checkCertificateEligibility(
  userId: string,
  courseId: string,
): Promise<{ eligible: boolean; reason?: string }> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    include: {
      progress: { where: { status: "COMPLETED" }, select: { id: true } },
      course: {
        include: {
          modules: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!enrollment) return { eligible: false, reason: "Kursga yozilmagansiz." };

  const course = enrollment.course;
  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const totalLessons = lessonIds.length;

  if (totalLessons === 0) {
    return { eligible: false, reason: "Kursda darslar mavjud emas." };
  }

  const completedCount = enrollment.progress.length;

  if (completedCount < totalLessons) {
    return {
      eligible: false,
      reason: `${totalLessons - completedCount} ta dars qolgan.`,
    };
  }

  const finalQuiz = await prisma.quiz.findFirst({
    where: { courseId, isFinal: true },
    select: {
      id: true,
      isOptional: true,
      _count: { select: { questions: true } },
    },
  });

  if (!finalQuiz) return { eligible: true };
  if (finalQuiz._count.questions === 0) return { eligible: true };
  if (finalQuiz.isOptional) return { eligible: true };

  const passedAttempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      quizId: finalQuiz.id,
      status: "PASSED",
    },
  });

  if (!passedAttempt) {
    return {
      eligible: false,
      reason: "Yakuniy testni muvaffaqiyatli topshirish kerak.",
    };
  }

  return { eligible: true };
}
