import { AttemptStatus } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/prisma";

type GenerateCertificateParams = {
  attemptId: string;
  expectedUserId?: string;
  generatedBy: string;
};

export async function generateCertificateForPassedFinalAttempt({
  attemptId,
  expectedUserId,
  generatedBy,
}: GenerateCertificateParams) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          course: {
            include: {
              modules: {
                include: { lessons: true },
              },
            },
          },
        },
      },
      user: true,
    },
  });

  if (!attempt) {
    throw new Error("Urinish topilmadi.");
  }
  if (expectedUserId && attempt.userId !== expectedUserId) {
    throw new Error("Bu urinish sizga tegishli emas.");
  }
  if (!attempt.quiz.isFinal || attempt.status !== AttemptStatus.PASSED) {
    throw new Error("Sertifikat olish uchun yakuniy testdan o'tilgan bo'lishi kerak.");
  }

  const totalLessons = attempt.quiz.course.modules.reduce((acc, moduleItem) => acc + moduleItem.lessons.length, 0);
  const passedQuizzes = await prisma.quizAttempt.count({
    where: {
      userId: attempt.userId,
      quiz: { courseId: attempt.quiz.courseId },
      status: AttemptStatus.PASSED,
    },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 25,
    y: 25,
    width: 792,
    height: 545,
    borderColor: rgb(0.05, 0.44, 0.35),
    borderWidth: 3,
  });
  page.drawText("Eduhistory Sertifikati", {
    x: 240,
    y: 505,
    size: 30,
    font: titleFont,
    color: rgb(0.05, 0.44, 0.35),
  });
  page.drawText(`${attempt.user.fullName} kursni muvaffaqiyatli yakunladi`, {
    x: 185,
    y: 450,
    size: 18,
    font: textFont,
  });
  page.drawText(`Kurs: ${attempt.quiz.course.title}`, { x: 140, y: 405, size: 16, font: textFont });
  page.drawText(`Final score: ${attempt.scorePercent}%`, { x: 140, y: 375, size: 14, font: textFont });
  page.drawText(`Umumiy darslar: ${totalLessons}`, { x: 140, y: 345, size: 14, font: textFont });
  page.drawText(`O'tilgan quizlar: ${passedQuizzes}`, { x: 140, y: 320, size: 14, font: textFont });
  page.drawText(`Sana: ${new Date().toLocaleDateString("uz-UZ")}`, { x: 140, y: 295, size: 14, font: textFont });

  const bytes = await pdf.save();
  const fileName = `certificate-${attempt.id}.pdf`;
  const relativePath = `/certificates/${fileName}`;
  const outputDir = join(process.cwd(), "public", "certificates");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, fileName), bytes);

  return prisma.certificate.upsert({
    where: {
      userId_courseId: {
        userId: attempt.userId,
        courseId: attempt.quiz.courseId,
      },
    },
    update: {
      quizAttemptId: attempt.id,
      pdfUrl: relativePath,
      finalScore: attempt.scorePercent,
      completionPercent: 100,
      totalLessons,
      totalQuizzesPassed: passedQuizzes,
      metadata: {
        generatedBy,
      },
    },
    create: {
      userId: attempt.userId,
      courseId: attempt.quiz.courseId,
      quizAttemptId: attempt.id,
      pdfUrl: relativePath,
      finalScore: attempt.scorePercent,
      completionPercent: 100,
      totalLessons,
      totalQuizzesPassed: passedQuizzes,
      metadata: {
        generatedBy,
      },
    },
  });
}
