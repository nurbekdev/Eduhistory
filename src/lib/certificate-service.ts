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
const MARGIN = 44;
const INNER_W = PAGE_W - 2 * MARGIN;
const INNER_H = PAGE_H - 2 * MARGIN;
const EMERALD = rgb(0.06, 0.46, 0.37);
const EMERALD_LIGHT = rgb(0.85, 0.95, 0.92);
const EMERALD_DARK = rgb(0.04, 0.32, 0.26);
const SLATE = rgb(0.12, 0.14, 0.18);
const SLATE_MUTED = rgb(0.35, 0.4, 0.48);
const GOLD = rgb(0.65, 0.52, 0.18);

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
  const top = PAGE_H - MARGIN;
  const bottom = MARGIN;

  // Single clean border
  page.drawRectangle({
    x: left,
    y: bottom,
    width: INNER_W,
    height: INNER_H,
    borderColor: EMERALD_DARK,
    borderWidth: 1.2,
  });

  // Top banner — full width, professional
  const bannerH = 72;
  const bannerBottom = top - bannerH;
  page.drawRectangle({
    x: left,
    y: bannerBottom,
    width: INNER_W,
    height: bannerH,
    color: EMERALD_DARK,
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
        const maxLogoW = 220;
        const maxLogoH = 32;
        const scale = Math.min(maxLogoW / img.width, maxLogoH / img.height, 1);
        const logoW = img.width * scale;
        const logoH = img.height * scale;
        const logoX = (PAGE_W - logoW) / 2;
        const logoY = bannerBottom + bannerH - logoH - 12;
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
      x: centerX(titleFont, "EDUHISTORY", 14),
      y: bannerBottom + 42,
      size: 14,
      font: titleFont,
      color: rgb(1, 1, 1),
    });
  }
  page.drawText("SERTIFIKAT", {
    x: centerX(titleFont, "SERTIFIKAT", 20),
    y: bannerBottom + 14,
    size: 20,
    font: titleFont,
    color: rgb(1, 1, 1),
  });

  const contentTop = bannerBottom - 24;
  const certLine = "Quyidagi shaxs quyidagi kursni muvaffaqiyatli yakunlaganligini tasdiqlaydi:";
  page.drawText(certLine, {
    x: centerX(textFont, certLine, 10),
    y: contentTop - 14,
    size: 10,
    font: textFont,
    color: SLATE_MUTED,
  });

  const name = attempt.user.fullName;
  page.drawText(name, {
    x: centerX(titleFont, name, 26),
    y: contentTop - 58,
    size: 26,
    font: titleFont,
    color: SLATE,
  });

  const courseTitle = attempt.quiz.course.title;
  const courseLabel = "Kurs: ";
  const courseFull = courseLabel + courseTitle;
  const maxCourseW = INNER_W - 80;
  let courseSize = 14;
  let courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  if (courseTextW > maxCourseW) {
    courseSize = 11;
    courseTextW = titleFont.widthOfTextAtSize(courseFull, courseSize);
  }
  page.drawText(courseLabel, {
    x: (PAGE_W - courseTextW) / 2,
    y: contentTop - 88,
    size: courseSize,
    font: textFont,
    color: SLATE_MUTED,
  });
  page.drawText(courseTitle, {
    x: (PAGE_W - courseTextW) / 2 + textFont.widthOfTextAtSize(courseLabel, courseSize),
    y: contentTop - 88,
    size: courseSize,
    font: titleFont,
    color: SLATE,
  });

  const statsY = contentTop - 168;
  const statFontSize = 10;
  const labelFontSize = 8;
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
      y: statsY - 6,
      size: labelFontSize,
      font: textFont,
      color: SLATE_MUTED,
    });
    page.drawText(value, {
      x: cx - valueW / 2,
      y: statsY - 22,
      size: statFontSize,
      font: titleFont,
      color: EMERALD_DARK,
    });
  });

  const footerAreaTop = bottom + 100;
  const sealX = right - 56;
  const sealY = footerAreaTop - 24;

  const footerY = bottom + 28;
  page.drawText("Eduhistory", {
    x: centerX(titleFont, "Eduhistory", 12),
    y: footerY,
    size: 12,
    font: titleFont,
    color: EMERALD_DARK,
  });
  page.drawText("O'quv boshqaruv tizimi", {
    x: centerX(textFont, "O'quv boshqaruv tizimi", 8),
    y: footerY - 14,
    size: 8,
    font: textFont,
    color: SLATE_MUTED,
  });

  if (certSettings?.signatureUrl) {
    const sigData = await loadImageBytes(certSettings.signatureUrl);
    if (sigData) {
      try {
        const sigImg = sigData.isPng
          ? await pdf.embedPng(sigData.bytes)
          : await pdf.embedJpg(sigData.bytes);
        const maxSigW = 88;
        const maxSigH = 36;
        const sigScale = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height, 1);
        const sigW = sigImg.width * sigScale;
        const sigH = sigImg.height * sigScale;
        const sigX = sealX - 110;
        const sigY = footerAreaTop - 50;
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

  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 28,
    borderColor: EMERALD_DARK,
    borderWidth: 1.5,
  });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 24,
    borderColor: GOLD,
    borderWidth: 0.5,
  });
  page.drawText("E", {
    x: sealX - titleFont.widthOfTextAtSize("E", 16) / 2,
    y: sealY - 5.5,
    size: 16,
    font: titleFont,
    color: EMERALD_DARK,
  });

  // QR block — all text and QR strictly inside one box with padding
  const qrSize = 80;
  const qrPadding = 12;
  const verifyLabel = "Haqiqiyligini tekshirish:";
  const qrScanLabel = "QR skanerlang";
  const labelSize = 10;
  const qrBoxW = Math.max(160, Math.ceil(Math.max(
    titleFont.widthOfTextAtSize(verifyLabel, labelSize),
    textFont.widthOfTextAtSize(qrScanLabel, labelSize),
  ) + qrPadding * 2));
  const qrBoxH = qrPadding + labelSize + 6 + qrSize + 6 + labelSize + qrPadding;
  const qrBoxX = left + 16;
  const qrBoxY = bottom + 16;

  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxW,
    height: qrBoxH,
    borderColor: EMERALD_DARK,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: qrBoxX + 1,
    y: qrBoxY + 1,
    width: qrBoxW - 2,
    height: qrBoxH - 2,
    borderColor: EMERALD_LIGHT,
    borderWidth: 0.5,
  });

  const topLabelY = qrBoxY + qrBoxH - qrPadding - labelSize;
  page.drawText(verifyLabel, {
    x: qrBoxX + (qrBoxW - titleFont.widthOfTextAtSize(verifyLabel, labelSize)) / 2,
    y: topLabelY,
    size: labelSize,
    font: titleFont,
    color: EMERALD_DARK,
  });

  if (qrPngBytes) {
    try {
      const qrImage = await pdf.embedPng(qrPngBytes);
      const qrX = qrBoxX + (qrBoxW - qrSize) / 2;
      const qrY = topLabelY - 6 - qrSize;
      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    } catch {
      // ignore
    }
  }

  const bottomLabelY = qrBoxY + qrPadding;
  page.drawText(qrScanLabel, {
    x: qrBoxX + (qrBoxW - textFont.widthOfTextAtSize(qrScanLabel, labelSize)) / 2,
    y: bottomLabelY,
    size: labelSize,
    font: textFont,
    color: EMERALD_DARK,
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
