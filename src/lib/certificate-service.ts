import { AttemptStatus } from "@prisma/client";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/prisma";

type GenerateCertificateParams = {
  attemptId: string;
  expectedUserId?: string;
  generatedBy: string;
};

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 44;
const INNER_W = PAGE_W - 2 * MARGIN;
const INNER_H = PAGE_H - 2 * MARGIN;
const EMERALD = rgb(0.05, 0.44, 0.35);
const EMERALD_LIGHT = rgb(0.7, 0.9, 0.85);
const SLATE = rgb(0.2, 0.23, 0.28);
const SLATE_MUTED = rgb(0.45, 0.5, 0.55);

function centerX(font: PDFFont, text: string, size: number): number {
  const w = font.widthOfTextAtSize(text, size);
  return (PAGE_W - w) / 2;
}

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
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdf.embedFont(StandardFonts.Helvetica);

  const left = MARGIN;
  const right = PAGE_W - MARGIN;
  const bottom = MARGIN;
  const top = PAGE_H - MARGIN;

  // Double decorative border
  page.drawRectangle({
    x: left,
    y: bottom,
    width: INNER_W,
    height: INNER_H,
    borderColor: EMERALD,
    borderWidth: 2.5,
  });
  page.drawRectangle({
    x: left + 6,
    y: bottom + 6,
    width: INNER_W - 12,
    height: INNER_H - 12,
    borderColor: EMERALD_LIGHT,
    borderWidth: 0.8,
  });

  // Top banner
  const bannerBottom = top - 58;
  page.drawRectangle({
    x: left + 8,
    y: bannerBottom,
    width: INNER_W - 16,
    height: 50,
    color: EMERALD,
  });
  page.drawText("EDUHISTORY", {
    x: centerX(titleFont, "EDUHISTORY", 11),
    y: bannerBottom + 32,
    size: 11,
    font: titleFont,
    color: rgb(1, 1, 1),
  });
  page.drawText("SERTIFIKAT", {
    x: centerX(titleFont, "SERTIFIKAT", 22),
    y: bannerBottom + 12,
    size: 22,
    font: titleFont,
    color: rgb(1, 1, 1),
  });

  // Certificate line (centered)
  const certLine = "Quyidagi shaxs quyidagi kursni muvaffaqiyatli yakunlaganligini tasdiqlaydi:";
  page.drawText(certLine, {
    x: centerX(textFont, certLine, 12),
    y: bannerBottom - 28,
    size: 12,
    font: textFont,
    color: SLATE_MUTED,
  });

  // Recipient name (large, centered)
  const name = attempt.user.fullName;
  page.drawText(name, {
    x: centerX(titleFont, name, 26),
    y: bannerBottom - 75,
    size: 26,
    font: titleFont,
    color: SLATE,
  });

  // Course title
  const courseTitle = attempt.quiz.course.title;
  const courseLabel = "Kurs: ";
  const courseFull = courseLabel + courseTitle;
  const maxCourseW = INNER_W - 80;
  let courseSize = 16;
  let courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  if (courseTextW > maxCourseW) {
    courseSize = 12;
    courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  }
  page.drawText(courseLabel, {
    x: (PAGE_W - courseTextW) / 2,
    y: bannerBottom - 115,
    size: courseSize,
    font: textFont,
    color: SLATE_MUTED,
  });
  page.drawText(courseTitle, {
    x: (PAGE_W - courseTextW) / 2 + textFont.widthOfTextAtSize(courseLabel, courseSize),
    y: bannerBottom - 115,
    size: courseSize,
    font: titleFont,
    color: SLATE,
  });

  // Stats row (four boxes)
  const statsY = bannerBottom - 185;
  const statFontSize = 11;
  const labelFontSize = 9;
  const boxW = (INNER_W - 80) / 4;
  const boxStart = left + 40;
  const statItems: [string, string][] = [
    ["Final ball", `${attempt.scorePercent}%`],
    ["Darslar", `${totalLessons}`],
    ["O'tilgan quiz", `${passedQuizzes}`],
    ["Sana", new Date().toLocaleDateString("uz-UZ")],
  ];
  statItems.forEach(([label, value], i) => {
    const cx = boxStart + i * boxW + boxW / 2;
    const labelW = textFont.widthOfTextAtSize(label, labelFontSize);
    const valueW = titleFont.widthOfTextAtSize(value, statFontSize);
    page.drawText(label, {
      x: cx - labelW / 2,
      y: statsY - 8,
      size: labelFontSize,
      font: textFont,
      color: SLATE_MUTED,
    });
    page.drawText(value, {
      x: cx - valueW / 2,
      y: statsY - 28,
      size: statFontSize,
      font: titleFont,
      color: EMERALD,
    });
  });

  // Bottom: Eduhistory branding
  const footerY = bottom + 28;
  page.drawText("Eduhistory", {
    x: centerX(titleFont, "Eduhistory", 14),
    y: footerY,
    size: 14,
    font: titleFont,
    color: EMERALD,
  });
  page.drawText("O'quv boshqaruv tizimi", {
    x: centerX(textFont, "O'quv boshqaruv tizimi", 9),
    y: footerY - 16,
    size: 9,
    font: textFont,
    color: SLATE_MUTED,
  });

  // Decorative seal (circle with check style)
  const sealX = right - 70;
  const sealY = bottom + 70;
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 32,
    borderColor: EMERALD,
    borderWidth: 2,
  });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 28,
    borderColor: EMERALD_LIGHT,
    borderWidth: 0.5,
  });
  page.drawText("E", {
    x: sealX - titleFont.widthOfTextAtSize("E", 18) / 2,
    y: sealY - 6,
    size: 18,
    font: titleFont,
    color: EMERALD,
  });

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
