import { AttemptStatus } from "@prisma/client";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";

import { prisma } from "@/lib/prisma";

const CERTIFICATE_SETTINGS_ID = "default";

async function loadImageBytes(
  url: string
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  try {
    const isPng = /\.png$/i.test(url) || url.toLowerCase().includes(".png");
    if (url.startsWith("/")) {
      const path = join(process.cwd(), "public", url);
      const buffer = await readFile(path);
      return { bytes: new Uint8Array(buffer), isPng };
    }
    if (!url.startsWith("http")) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return { bytes: new Uint8Array(ab), isPng };
  } catch {
    return null;
  }
}

type GenerateCertificateParams = {
  attemptId: string;
  expectedUserId?: string;
  generatedBy: string;
};

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 48;
const INNER_W = PAGE_W - 2 * MARGIN;
const INNER_H = PAGE_H - 2 * MARGIN;
const EMERALD = rgb(0.05, 0.44, 0.35);
const EMERALD_LIGHT = rgb(0.7, 0.9, 0.85);
const EMERALD_DARK = rgb(0.04, 0.35, 0.28);
const SLATE = rgb(0.15, 0.18, 0.22);
const SLATE_MUTED = rgb(0.4, 0.45, 0.52);
const GOLD = rgb(0.72, 0.55, 0.2);

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

  const existingCertificate = await prisma.certificate.findUnique({
    where: {
      userId_courseId: {
        userId: attempt.userId,
        courseId: attempt.quiz.courseId,
      },
    },
    select: { uuid: true },
  });

  const verifyUuid = existingCertificate?.uuid ?? crypto.randomUUID();
  const baseUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://eduhistory.uz").replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/sertifikat/${verifyUuid}`;

  let qrPngBytes: Uint8Array | null = null;
  try {
    qrPngBytes = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#065F46", light: "#ffffff" },
    });
  } catch {
    // QR generation failed; certificate still valid, just no QR
  }

  const certSettings = await prisma.certificateSettings.findUnique({
    where: { id: CERTIFICATE_SETTINGS_ID },
    select: { logoUrl: true, signatureUrl: true },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdf.embedFont(StandardFonts.Helvetica);

  const left = MARGIN;
  const right = PAGE_W - MARGIN;
  const bottom = MARGIN;
  const top = PAGE_H - MARGIN;

  // Outer frame (thick)
  page.drawRectangle({
    x: left,
    y: bottom,
    width: INNER_W,
    height: INNER_H,
    borderColor: EMERALD_DARK,
    borderWidth: 3,
  });
  // Inner frame
  page.drawRectangle({
    x: left + 8,
    y: bottom + 8,
    width: INNER_W - 16,
    height: INNER_H - 16,
    borderColor: EMERALD_LIGHT,
    borderWidth: 0.8,
  });
  // Corner accents (small squares)
  const cornerSize = 12;
  [left + 11, right - 11 - cornerSize].forEach((x) => {
    [bottom + 11, top - 11 - cornerSize].forEach((y) => {
      page.drawRectangle({
        x,
        y,
        width: cornerSize,
        height: cornerSize,
        borderColor: GOLD,
        borderWidth: 1,
      });
    });
  });

  // Top banner
  const bannerBottom = top - 62;
  const bannerW = INNER_W - 24;
  const bannerH = 54;
  page.drawRectangle({
    x: left + 12,
    y: bannerBottom,
    width: bannerW,
    height: bannerH,
    color: EMERALD,
  });

  const hasLogo = Boolean(certSettings?.logoUrl);
  let logoDrawn = false;
  if (certSettings?.logoUrl) {
    const imgData = await loadImageBytes(certSettings.logoUrl);
    if (imgData) {
      try {
        const img = imgData.isPng
          ? await pdf.embedPng(imgData.bytes)
          : await pdf.embedJpg(imgData.bytes);
        const maxLogoW = 200;
        const maxLogoH = 28;
        const scale = Math.min(maxLogoW / img.width, maxLogoH / img.height, 1);
        const logoW = img.width * scale;
        const logoH = img.height * scale;
        const logoX = (PAGE_W - logoW) / 2;
        const logoY = bannerBottom + bannerH - logoH - 8;
        page.drawImage(img, {
          x: logoX,
          y: logoY,
          width: logoW,
          height: logoH,
        });
        logoDrawn = true;
      } catch {
        // embed failed, fall back to text
      }
    }
  }
  if (!logoDrawn) {
    page.drawText("EDUHISTORY", {
      x: centerX(titleFont, "EDUHISTORY", 12),
      y: bannerBottom + 34,
      size: 12,
      font: titleFont,
      color: rgb(1, 1, 1),
    });
  }
  page.drawText("SERTIFIKAT", {
    x: centerX(titleFont, "SERTIFIKAT", hasLogo && logoDrawn ? 14 : 24),
    y: bannerBottom + (hasLogo && logoDrawn ? 4 : 12),
    size: hasLogo && logoDrawn ? 14 : 24,
    font: titleFont,
    color: rgb(1, 1, 1),
  });

  const certLine = "Quyidagi shaxs quyidagi kursni muvaffaqiyatli yakunlaganligini tasdiqlaydi:";
  page.drawText(certLine, {
    x: centerX(textFont, certLine, 11),
    y: bannerBottom - 32,
    size: 11,
    font: textFont,
    color: SLATE_MUTED,
  });

  const name = attempt.user.fullName;
  page.drawText(name, {
    x: centerX(titleFont, name, 28),
    y: bannerBottom - 82,
    size: 28,
    font: titleFont,
    color: SLATE,
  });

  const courseTitle = attempt.quiz.course.title;
  const courseLabel = "Kurs: ";
  const courseFull = courseLabel + courseTitle;
  const maxCourseW = INNER_W - 100;
  let courseSize = 16;
  let courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  if (courseTextW > maxCourseW) {
    courseSize = 12;
    courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  }
  page.drawText(courseLabel, {
    x: (PAGE_W - courseTextW) / 2,
    y: bannerBottom - 118,
    size: courseSize,
    font: textFont,
    color: SLATE_MUTED,
  });
  page.drawText(courseTitle, {
    x: (PAGE_W - courseTextW) / 2 + textFont.widthOfTextAtSize(courseLabel, courseSize),
    y: bannerBottom - 118,
    size: courseSize,
    font: titleFont,
    color: SLATE,
  });

  const statsY = bannerBottom - 192;
  const statFontSize = 11;
  const labelFontSize = 9;
  const boxW = (INNER_W - 100) / 4;
  const boxStart = left + 50;
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

  const sealX = right - 72;
  const sealY = bottom + 78;

  const footerY = bottom + 32;
  page.drawText("Eduhistory", {
    x: centerX(titleFont, "Eduhistory", 14),
    y: footerY,
    size: 14,
    font: titleFont,
    color: EMERALD,
  });
  page.drawText("O'quv boshqaruv tizimi", {
    x: centerX(textFont, "O'quv boshqaruv tizimi", 9),
    y: footerY - 18,
    size: 9,
    font: textFont,
    color: SLATE_MUTED,
  });

  // Signature (from settings) – left of seal, above footer text
  if (certSettings?.signatureUrl) {
    const sigData = await loadImageBytes(certSettings.signatureUrl);
    if (sigData) {
      try {
        const sigImg = sigData.isPng
          ? await pdf.embedPng(sigData.bytes)
          : await pdf.embedJpg(sigData.bytes);
        const maxSigW = 90;
        const maxSigH = 38;
        const sigScale = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height, 1);
        const sigW = sigImg.width * sigScale;
        const sigH = sigImg.height * sigScale;
        const sigX = sealX - 120;
        const sigY = bottom + 52;
        page.drawImage(sigImg, {
          x: sigX,
          y: sigY,
          width: sigW,
          height: sigH,
        });
      } catch {
        // embed failed
      }
    }
  }

  // Seal (E)
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 34,
    borderColor: EMERALD,
    borderWidth: 2,
  });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 30,
    borderColor: GOLD,
    borderWidth: 0.6,
  });
  page.drawText("E", {
    x: sealX - titleFont.widthOfTextAtSize("E", 20) / 2,
    y: sealY - 7,
    size: 20,
    font: titleFont,
    color: EMERALD,
  });

  // QR code + verification box (bottom-left) – larger QR for better scan
  const qrSize = 88;
  const qrBoxX = left + 20;
  const qrBoxY = bottom + 20;
  const qrBoxW = 140;
  const qrBoxH = 118;
  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxW,
    height: qrBoxH,
    borderColor: EMERALD_LIGHT,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: qrBoxX + 2,
    y: qrBoxY + 2,
    width: qrBoxW - 4,
    height: qrBoxH - 4,
    borderColor: EMERALD,
    borderWidth: 0.5,
  });
  if (qrPngBytes) {
    try {
      const qrImage = await pdf.embedPng(qrPngBytes);
      const qrX = qrBoxX + (qrBoxW - qrSize) / 2;
      const qrY = qrBoxY + qrBoxH - qrSize - 10;
      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    } catch {
      // ignore embed error
    }
  }
  const verifyLabel = "Haqiqiyligini tekshirish:";
  page.drawText(verifyLabel, {
    x: qrBoxX + (qrBoxW - textFont.widthOfTextAtSize(verifyLabel, 9)) / 2,
    y: qrBoxY + 8,
    size: 9,
    font: titleFont,
    color: EMERALD,
  });
  page.drawText("QR skanerlang", {
    x: qrBoxX + (qrBoxW - textFont.widthOfTextAtSize("QR skanerlang", 8)) / 2,
    y: qrBoxY + 2,
    size: 8,
    font: textFont,
    color: SLATE_MUTED,
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
      uuid: verifyUuid,
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
