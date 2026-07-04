import { AttemptStatus } from "@prisma/client";
import { PDFDocument, PDFFont, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";

import { checkCertificateEligibility } from "@/lib/certificate-eligibility";
import { prisma } from "@/lib/prisma";

const CERTIFICATE_SETTINGS_ID = "default";

// Certificate palette.
const C_PAPER       = rgb(0.982, 0.973, 0.945);
const C_PAPER_2     = rgb(0.948, 0.934, 0.894);
const C_NAVY        = rgb(0.035, 0.071, 0.141);
const C_NAVY_2      = rgb(0.063, 0.123, 0.227);
const C_TEAL        = rgb(0.000, 0.480, 0.471);
const C_TEAL_SOFT   = rgb(0.838, 0.945, 0.925);
const C_GOLD        = rgb(0.805, 0.617, 0.259);
const C_GOLD_DARK   = rgb(0.541, 0.386, 0.145);
const C_GOLD_PALE   = rgb(0.923, 0.828, 0.585);
const C_CORAL       = rgb(0.886, 0.349, 0.255);
const C_INK         = rgb(0.085, 0.090, 0.106);
const C_MUTED       = rgb(0.404, 0.443, 0.506);
const C_LINE        = rgb(0.776, 0.704, 0.569);
const C_WHITE       = rgb(1, 1, 1);
const C_BLACK       = rgb(0, 0, 0);

// A4 landscape.
const W   = 841.89;
const H   = 595.28;
const PAD = 30;

type PdfColor = ReturnType<typeof rgb>;
type Page = PDFPage;
type ImageData = { bytes: Uint8Array; type: "png" | "jpg" };

async function loadImageBytes(url: string): Promise<ImageData | null> {
  try {
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (/\.(webp|svg)$/i.test(cleanUrl)) return null;
    let type: ImageData["type"] = /\.png$/i.test(cleanUrl) ? "png" : "jpg";

    if (url.startsWith("/")) {
      const buf = await readFile(join(process.cwd(), "public", url));
      return { bytes: new Uint8Array(buf), type };
    }

    if (!url.startsWith("http")) return null;

    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("png")) type = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) type = "jpg";
    return { bytes: new Uint8Array(await res.arrayBuffer()), type };
  } catch {
    return null;
  }
}

function pdfText(value: string): string {
  const cyrillic: Record<string, string> = {
    А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g", Д: "D", д: "d",
    Е: "E", е: "e", Ё: "Yo", ё: "yo", Ж: "J", ж: "j", З: "Z", з: "z", И: "I", и: "i",
    Й: "Y", й: "y", К: "K", к: "k", Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n",
    О: "O", о: "o", П: "P", п: "p", Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t",
    У: "U", у: "u", Ф: "F", ф: "f", Х: "X", х: "x", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch",
    Ш: "Sh", ш: "sh", Щ: "Sh", щ: "sh", Ъ: "", ъ: "", Ы: "I", ы: "i", Ь: "", ь: "",
    Э: "E", э: "e", Ю: "Yu", ю: "yu", Я: "Ya", я: "ya", Ў: "O'", ў: "o'",
    Ў: "O'", ў: "o'", Қ: "Q", қ: "q", Ғ: "G'", ғ: "g'", Ҳ: "H", ҳ: "h",
  };

  return value
    .split("")
    .map((char) => cyrillic[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u2018\u2019\u02bb\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fitTextSize(font: PDFFont, text: string, maxSize: number, minSize: number, maxW: number): number {
  const value = pdfText(text);
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    if (font.widthOfTextAtSize(value, size) <= maxW) return size;
  }
  return minSize;
}

function trimToWidth(font: PDFFont, text: string, size: number, maxW: number): string {
  let value = pdfText(text);
  if (font.widthOfTextAtSize(value, size) <= maxW) return value;
  const suffix = "...";
  while (value.length > 0 && font.widthOfTextAtSize(`${value}${suffix}`, size) > maxW) {
    value = value.slice(0, -1);
  }
  return `${value.trimEnd()}${suffix}`;
}

function wrapText(font: PDFFont, text: string, size: number, maxW: number, maxLines = 4): string[] {
  const words = pdfText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test;
      continue;
    }

    if (cur) lines.push(cur);
    cur = w;

    if (font.widthOfTextAtSize(cur, size) > maxW) {
      let chunk = "";
      for (const char of cur) {
        const testChunk = `${chunk}${char}`;
        if (font.widthOfTextAtSize(testChunk, size) <= maxW) {
          chunk = testChunk;
        } else {
          if (chunk) lines.push(chunk);
          chunk = char;
        }
      }
      cur = chunk;
    }
  }

  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = trimToWidth(font, clipped[maxLines - 1], size, maxW);
  return clipped;
}

function formatDateUz(date: Date): string {
  const m = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
  return `${date.getFullYear()}-yil, ${date.getDate()}-${m[date.getMonth()]}`;
}

function drawCenteredText(
  page: Page,
  font: PDFFont,
  text: string,
  size: number,
  x: number,
  y: number,
  width: number,
  color: PdfColor,
  opacity = 1
) {
  const value = pdfText(text);
  page.drawText(value, {
    x: x + (width - font.widthOfTextAtSize(value, size)) / 2,
    y,
    size,
    font,
    color,
    opacity,
  });
}

function drawRightText(
  page: Page,
  font: PDFFont,
  text: string,
  size: number,
  rightX: number,
  y: number,
  color: PdfColor,
  opacity = 1
) {
  const value = pdfText(text);
  page.drawText(value, {
    x: rightX - font.widthOfTextAtSize(value, size),
    y,
    size,
    font,
    color,
    opacity,
  });
}

function drawDivider(page: Page, x: number, y: number, width: number) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.8, color: C_GOLD, opacity: 0.55 });
  page.drawLine({ start: { x: x + width * 0.24, y: y + 3 }, end: { x: x + width * 0.76, y: y + 3 }, thickness: 0.45, color: C_GOLD_PALE, opacity: 0.75 });
  drawDiamond(page, x + width / 2, y + 1.5, 5);
}

function drawDiamond(page: Page, x: number, y: number, size = 5) {
  page.drawLine({ start: { x: x - size, y }, end: { x, y: y + size }, thickness: 1, color: C_GOLD });
  page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 1, color: C_GOLD });
  page.drawLine({ start: { x: x + size, y }, end: { x, y: y - size }, thickness: 1, color: C_GOLD });
  page.drawLine({ start: { x, y: y - size }, end: { x: x - size, y }, thickness: 1, color: C_GOLD });
  page.drawCircle({ x, y, size: 1.5, color: C_GOLD_PALE });
}

function drawCorner(page: Page, ox: number, oy: number, sx: number, sy: number) {
  const L = 54;
  const L2 = 32;
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox + sx * L, y: oy }, thickness: 2, color: C_GOLD });
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox, y: oy + sy * L }, thickness: 2, color: C_GOLD });
  page.drawLine({ start: { x: ox + sx * 8, y: oy + sy * 8 }, end: { x: ox + sx * L2, y: oy + sy * 8 }, thickness: 0.6, color: C_GOLD_PALE, opacity: 0.7 });
  page.drawLine({ start: { x: ox + sx * 8, y: oy + sy * 8 }, end: { x: ox + sx * 8, y: oy + sy * L2 }, thickness: 0.6, color: C_GOLD_PALE, opacity: 0.7 });
  page.drawCircle({ x: ox, y: oy, size: 3.5, color: C_GOLD });
}

function drawSeal(page: Page, fBold: PDFFont, fReg: PDFFont, cx: number, cy: number, year: number) {
  const R_OUT = 47;
  const R_MID = 39;
  const R_IN = 31;

  for (let a = 0; a < 360; a += 6) {
    const r1 = (a * Math.PI) / 180;
    const r2 = ((a + 3.2) * Math.PI) / 180;
    page.drawLine({
      start: { x: cx + R_OUT * Math.cos(r1), y: cy + R_OUT * Math.sin(r1) },
      end: { x: cx + R_OUT * Math.cos(r2), y: cy + R_OUT * Math.sin(r2) },
      thickness: 1.25,
      color: C_GOLD,
    });
  }
  page.drawCircle({ x: cx, y: cy, size: R_MID, color: C_WHITE, opacity: 0.92, borderColor: C_GOLD_DARK, borderWidth: 1.1 });
  page.drawCircle({ x: cx, y: cy, size: R_IN, color: C_PAPER, borderColor: C_GOLD_PALE, borderWidth: 0.8 });

  const mono = "EH";
  page.drawText(mono, {
    x: cx - fBold.widthOfTextAtSize(mono, 20) / 2,
    y: cy + 5,
    size: 20,
    font: fBold,
    color: C_GOLD_DARK,
  });
  page.drawLine({ start: { x: cx - 24, y: cy }, end: { x: cx + 24, y: cy }, thickness: 0.8, color: C_GOLD });
  const yr = String(year);
  page.drawText(yr, {
    x: cx - fReg.widthOfTextAtSize(yr, 8) / 2,
    y: cy - 15,
    size: 8,
    font: fReg,
    color: C_INK,
  });
  drawCenteredText(page, fReg, "VERIFIED", 5.6, cx - 28, cy - 28, 56, C_MUTED, 0.82);
}

function drawSignatureWave(page: Page, sx: number, sy: number, color = C_NAVY_2) {
  const pts = [
    { x: sx, y: sy + 15 },
    { x: sx + 18, y: sy + 28 },
    { x: sx + 38, y: sy + 12 },
    { x: sx + 56, y: sy + 26 },
    { x: sx + 76, y: sy + 15 },
    { x: sx + 100, y: sy + 25 },
    { x: sx + 126, y: sy + 13 },
  ];
  for (let i = 0; i < pts.length - 1; i += 1) {
    page.drawLine({ start: pts[i], end: pts[i + 1], thickness: 1.25, color, opacity: 0.65 });
  }
}

async function drawImageInBox(
  pdf: PDFDocument,
  page: Page,
  url: string | null | undefined,
  box: { x: number; y: number; width: number; height: number },
  opacity = 1
): Promise<boolean> {
  if (!url) return false;
  const imgData = await loadImageBytes(url);
  if (!imgData) return false;

  try {
    const img = imgData.type === "png" ? await pdf.embedPng(imgData.bytes) : await pdf.embedJpg(imgData.bytes);
    const scale = Math.min(box.width / img.width, box.height / img.height, 1);
    const width = img.width * scale;
    const height = img.height * scale;
    page.drawImage(img, {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
      opacity,
    });
    return true;
  } catch {
    return false;
  }
}

export type CertificateData = {
  studentName: string;
  courseTitle: string;
  courseCategory: string;
  finalScore: number;
  totalLessons: number;
  passedQuizzes: number;
  issuedDate: Date;
  verifyUrl: string;
  logoUrl?:      string | null;
  signatureUrl?: string | null;
  signerName?:   string;
  signerTitle?:  string;
};

export async function buildProCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf   = await PDFDocument.create();
  const page  = pdf.addPage([W, H]);
  const fTitle = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fSerif = await pdf.embedFont(StandardFonts.TimesRoman);
  const fItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const fHB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fH = await pdf.embedFont(StandardFonts.Helvetica);

  const uuid = pdfText(data.verifyUrl.split("/").pop() ?? "");
  const shortId = uuid ? uuid.slice(0, 8).toUpperCase() : "EDH";
  const dateStr = formatDateUz(data.issuedDate);
  const issuedShort = data.issuedDate.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C_PAPER });
  page.drawRectangle({ x: PAD - 6, y: PAD - 6, width: W - (PAD - 6) * 2, height: H - (PAD - 6) * 2, color: C_WHITE, opacity: 0.45 });

  for (let i = -H; i < W + H; i += 30) {
    page.drawLine({
      start: { x: i, y: 0 },
      end: { x: i + H, y: H },
      thickness: 0.35,
      color: C_GOLD,
      opacity: 0.055,
    });
  }

  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: C_GOLD, borderWidth: 1.7 });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: C_LINE, borderWidth: 0.7, opacity: 0.85 });
  drawCorner(page, 30, H - 30, 1, -1);
  drawCorner(page, W - 30, H - 30, -1, -1);
  drawCorner(page, 30, 30, 1, 1);
  drawCorner(page, W - 30, 30, -1, 1);

  const railX = 36;
  const railY = 36;
  const railW = 148;
  const railH = H - 72;
  page.drawRectangle({ x: railX, y: railY, width: railW, height: railH, color: C_NAVY });
  page.drawRectangle({ x: railX + railW - 7, y: railY, width: 4, height: railH, color: C_TEAL });
  page.drawRectangle({ x: railX + railW - 3, y: railY, width: 2, height: railH, color: C_GOLD });
  page.drawRectangle({ x: railX, y: railY + railH - 86, width: railW, height: 86, color: C_NAVY_2, opacity: 0.72 });
  page.drawRectangle({ x: railX, y: railY, width: railW, height: 72, color: C_BLACK, opacity: 0.13 });

  const logoDrawn = await drawImageInBox(pdf, page, data.logoUrl, { x: railX + 22, y: H - 96, width: railW - 44, height: 42 });
  if (!logoDrawn) {
    page.drawText("EDU", { x: railX + 28, y: H - 78, size: 24, font: fHB, color: C_GOLD });
    page.drawText("HISTORY", { x: railX + 28, y: H - 96, size: 11, font: fHB, color: C_WHITE, opacity: 0.9 });
  }

  drawCenteredText(page, fH, "VERIFIED LEARNING CREDENTIAL", 7.2, railX + 14, H - 127, railW - 28, C_GOLD_PALE, 0.88);
  page.drawLine({ start: { x: railX + 24, y: H - 146 }, end: { x: railX + railW - 24, y: H - 146 }, thickness: 0.7, color: C_GOLD, opacity: 0.58 });
  drawSeal(page, fHB, fH, railX + railW / 2, H / 2 + 8, data.issuedDate.getFullYear());
  drawCenteredText(page, fH, "CREDENTIAL ID", 7, railX + 22, 96, railW - 44, C_GOLD_PALE, 0.72);
  drawCenteredText(page, fHB, shortId, 12, railX + 22, 78, railW - 44, C_WHITE, 0.94);
  drawCenteredText(page, fH, "eduhistory.uz", 7.2, railX + 22, 55, railW - 44, C_GOLD_PALE, 0.82);

  const contentX = 214;
  const contentW = 428;
  const contentTop = H - 70;
  const rightX = 672;
  const rightW = 128;

  page.drawText("CERTIFICATE OF COMPLETION", { x: contentX, y: contentTop, size: 8.5, font: fHB, color: C_TEAL });
  drawRightText(page, fH, `Issued ${issuedShort}`, 8, contentX + contentW, contentTop, C_MUTED);

  const title = "SERTIFIKAT";
  const titleSize = 50;
  page.drawText(title, { x: contentX + 2, y: contentTop - 60, size: titleSize, font: fTitle, color: C_GOLD_PALE, opacity: 0.25 });
  page.drawText(title, { x: contentX, y: contentTop - 58, size: titleSize, font: fTitle, color: C_NAVY });
  drawDivider(page, contentX, contentTop - 72, contentW);

  drawCenteredText(page, fH, "Ushbu sertifikat bilan tasdiqlanadi", 9.5, contentX, contentTop - 104, contentW, C_MUTED);

  const studentName = pdfText(data.studentName || "Ism Familiya");
  const nameSize = fitTextSize(fTitle, studentName, 38, 24, contentW - 12);
  const nameY = contentTop - 154;
  drawCenteredText(page, fTitle, studentName, nameSize, contentX, nameY, contentW, C_NAVY_2);
  const nameW = Math.min(fTitle.widthOfTextAtSize(studentName, nameSize) + 42, contentW - 34);
  const nameLineX = contentX + (contentW - nameW) / 2;
  page.drawLine({ start: { x: nameLineX, y: nameY - 11 }, end: { x: nameLineX + nameW, y: nameY - 11 }, thickness: 2, color: C_GOLD });
  page.drawLine({ start: { x: nameLineX + nameW * 0.18, y: nameY - 7 }, end: { x: nameLineX + nameW * 0.82, y: nameY - 7 }, thickness: 0.55, color: C_GOLD_PALE, opacity: 0.75 });

  const body = `${data.studentName} ${dateStr} kuni Eduhistory o'quv platformasida kursni muvaffaqiyatli yakunlab, yakuniy baholash talablarini bajardi.`;
  let bodyY = nameY - 42;
  for (const line of wrapText(fSerif, body, 11, contentW - 38, 3)) {
    drawCenteredText(page, fSerif, line, 11, contentX + 19, bodyY, contentW - 38, C_INK);
    bodyY -= 16;
  }

  const courseBoxY = 218;
  page.drawRectangle({ x: contentX + 14, y: courseBoxY, width: contentW - 28, height: 58, color: C_WHITE, borderColor: C_LINE, borderWidth: 0.8, opacity: 0.93 });
  page.drawRectangle({ x: contentX + 14, y: courseBoxY + 54, width: contentW - 28, height: 4, color: C_TEAL, opacity: 0.86 });
  drawCenteredText(page, fH, "KURS NOMI", 7.5, contentX + 20, courseBoxY + 40, contentW - 40, C_GOLD_DARK, 0.85);
  const courseLines = wrapText(fHB, data.courseTitle || "Kurs nomi", 13.5, contentW - 72, 2);
  let courseY = courseLines.length > 1 ? courseBoxY + 20 : courseBoxY + 24;
  for (const line of courseLines) {
    drawCenteredText(page, fHB, line, 13.5, contentX + 36, courseY, contentW - 72, C_NAVY);
    courseY -= 16;
  }

  const statItems: [string, string, PdfColor][] = [
    [`${data.finalScore}%`, "FINAL BALL", C_CORAL],
    [`${data.totalLessons} ta`, "DARSLAR", C_TEAL],
    [`${data.passedQuizzes} ta`, "TESTLAR", C_GOLD_DARK],
    [data.courseCategory || "Umumiy", "KATEGORIYA", C_NAVY_2],
  ];
  const statGap = 8;
  const statW = (contentW - statGap * (statItems.length - 1)) / statItems.length;
  const statY = 145;
  statItems.forEach(([value, label, accent], index) => {
    const x = contentX + index * (statW + statGap);
    page.drawRectangle({ x, y: statY, width: statW, height: 46, color: C_WHITE, borderColor: C_LINE, borderWidth: 0.65, opacity: 0.92 });
    page.drawRectangle({ x, y: statY + 42, width: statW, height: 4, color: accent, opacity: 0.9 });
    const statSize = fitTextSize(fHB, value, 12.5, 7.5, statW - 12);
    drawCenteredText(page, fHB, value, statSize, x + 6, statY + 20, statW - 12, C_INK);
    drawCenteredText(page, fH, label, 6.2, x + 6, statY + 8, statW - 12, C_MUTED);
  });

  const sigY = 68;
  const sigW = 142;
  const sigLeftX = contentX + 8;
  const sigRightX = contentX + contentW - sigW - 8;
  const signatureDrawn = await drawImageInBox(pdf, page, data.signatureUrl, { x: sigLeftX, y: sigY + 27, width: sigW, height: 42 });
  if (!signatureDrawn) drawSignatureWave(page, sigLeftX + 8, sigY + 30);
  drawSignatureWave(page, sigRightX + 8, sigY + 30, C_TEAL);
  page.drawLine({ start: { x: sigLeftX, y: sigY + 26 }, end: { x: sigLeftX + sigW, y: sigY + 26 }, thickness: 0.9, color: C_GOLD });
  page.drawLine({ start: { x: sigRightX, y: sigY + 26 }, end: { x: sigRightX + sigW, y: sigY + 26 }, thickness: 0.9, color: C_GOLD });
  page.drawText(pdfText(data.signerName ?? "Eduhistory"), { x: sigLeftX, y: sigY + 11, size: 10, font: fHB, color: C_NAVY_2 });
  page.drawText(pdfText(data.signerTitle ?? "Platforma rahbari"), { x: sigLeftX, y: sigY, size: 7.5, font: fItalic, color: C_MUTED });
  drawRightText(page, fHB, "Kurs Mentori", 10, sigRightX + sigW, sigY + 11, C_NAVY_2);
  drawRightText(page, fItalic, trimToWidth(fItalic, data.courseTitle, 7.5, sigW), 7.5, sigRightX + sigW, sigY, C_MUTED);
  drawSeal(page, fHB, fH, contentX + contentW / 2, sigY + 30, data.issuedDate.getFullYear());

  page.drawRectangle({ x: rightX, y: 68, width: rightW, height: 422, color: C_WHITE, borderColor: C_LINE, borderWidth: 0.8, opacity: 0.95 });
  page.drawRectangle({ x: rightX, y: 444, width: rightW, height: 46, color: C_NAVY });
  drawCenteredText(page, fHB, "VERIFY", 13, rightX, 462, rightW, C_GOLD_PALE);
  drawCenteredText(page, fH, "SCAN QR", 6.8, rightX, 450, rightW, C_WHITE, 0.75);

  let qrPngBytes: Uint8Array | null = null;
  try {
    qrPngBytes = await QRCode.toBuffer(data.verifyUrl, {
      type: "png",
      width: 280,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#091224", light: "#ffffff" },
    });
  } catch {}

  if (qrPngBytes) {
    try {
      const qrImg = await pdf.embedPng(qrPngBytes);
      page.drawRectangle({ x: rightX + 19, y: 338, width: 90, height: 90, color: C_WHITE, borderColor: C_GOLD, borderWidth: 0.85 });
      page.drawImage(qrImg, { x: rightX + 24, y: 343, width: 80, height: 80 });
    } catch {}
  }

  drawCenteredText(page, fHB, "Haqiqiyligini tekshirish", 7.8, rightX + 12, 318, rightW - 24, C_NAVY);
  drawCenteredText(page, fH, "QR kodni skanerlang yoki", 6.3, rightX + 12, 305, rightW - 24, C_MUTED);
  drawCenteredText(page, fH, "havolani oching", 6.3, rightX + 12, 295, rightW - 24, C_MUTED);

  page.drawRectangle({ x: rightX + 14, y: 248, width: rightW - 28, height: 28, color: C_TEAL_SOFT, borderColor: C_TEAL, borderWidth: 0.45 });
  drawCenteredText(page, fHB, "100% COMPLETION", 7.2, rightX + 14, 258, rightW - 28, C_TEAL);

  page.drawLine({ start: { x: rightX + 20, y: 226 }, end: { x: rightX + rightW - 20, y: 226 }, thickness: 0.65, color: C_LINE });
  page.drawText("ID", { x: rightX + 18, y: 204, size: 6.3, font: fH, color: C_MUTED });
  drawRightText(page, fHB, shortId, 8, rightX + rightW - 18, 204, C_NAVY);
  page.drawText("SANA", { x: rightX + 18, y: 181, size: 6.3, font: fH, color: C_MUTED });
  drawRightText(page, fHB, issuedShort, 7.2, rightX + rightW - 18, 181, C_NAVY);

  const verifyLines = wrapText(fH, data.verifyUrl, 5.7, rightW - 34, 4);
  let verifyY = 132;
  for (const line of verifyLines) {
    drawCenteredText(page, fH, line, 5.7, rightX + 17, verifyY, rightW - 34, C_MUTED, 0.78);
    verifyY -= 8.5;
  }

  page.drawRectangle({ x: rightX + 16, y: 86, width: rightW - 32, height: 16, color: C_PAPER_2, borderColor: C_GOLD_PALE, borderWidth: 0.4 });
  drawCenteredText(page, fH, "Eduhistory digital seal", 5.9, rightX + 16, 91, rightW - 32, C_GOLD_DARK, 0.86);

  const footer = `eduhistory.uz - Sertifikat ID: ${uuid}`;
  drawCenteredText(page, fH, footer, 6.8, contentX, 38, contentW, C_MUTED, 0.74);

  return pdf.save();
}

// ─── Public API ────────────────────────────────────────────────────────────

type GenerateCertificateParams = {
  attemptId: string;
  expectedUserId?: string;
  generatedBy: string;
};

export async function generateCertificateForPassedFinalAttempt({
  attemptId, expectedUserId, generatedBy,
}: GenerateCertificateParams) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { course: { include: { modules: { include: { lessons: true } } } } } },
      user: true,
    },
  });

  if (!attempt) throw new Error("Urinish topilmadi.");
  if (expectedUserId && attempt.userId !== expectedUserId) throw new Error("Bu urinish sizga tegishli emas.");
  if (!attempt.quiz.isFinal || attempt.status !== AttemptStatus.PASSED)
    throw new Error("Sertifikat olish uchun yakuniy testdan o'tilgan bo'lishi kerak.");

  const totalLessons  = attempt.quiz.course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const passedQuizzes = await prisma.quizAttempt.count({
    where: { userId: attempt.userId, quiz: { courseId: attempt.quiz.courseId }, status: AttemptStatus.PASSED },
  });

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: attempt.userId, courseId: attempt.quiz.courseId } },
    select: { uuid: true },
  });
  const verifyUuid = existing?.uuid ?? crypto.randomUUID();
  const baseUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://eduhistory.uz").replace(/\/$/, "");

  const cs = await prisma.certificateSettings.findUnique({
    where: { id: CERTIFICATE_SETTINGS_ID }, select: { logoUrl: true, signatureUrl: true },
  });

  const bytes = await buildProCertificatePdf({
    studentName:    attempt.user.fullName,
    courseTitle:    attempt.quiz.course.title,
    courseCategory: (attempt.quiz.course as { category?: string }).category ?? "",
    finalScore:     attempt.scorePercent,
    totalLessons,
    passedQuizzes,
    issuedDate:     new Date(),
    verifyUrl:      `${baseUrl}/sertifikat/${verifyUuid}`,
    logoUrl:        cs?.logoUrl,
    signatureUrl:   cs?.signatureUrl,
  });

  const fileName     = `certificate-${attempt.id}.pdf`;
  const relativePath = `/certificates/${fileName}`;
  await mkdir(join(process.cwd(), "public", "certificates"), { recursive: true })
    .then(() => writeFile(join(process.cwd(), "public", "certificates", fileName), bytes))
    .catch(() => {});

  return prisma.certificate.upsert({
    where: { userId_courseId: { userId: attempt.userId, courseId: attempt.quiz.courseId } },
    update: { quizAttemptId: attempt.id, pdfUrl: relativePath, pdfContent: Buffer.from(bytes), finalScore: attempt.scorePercent, completionPercent: 100, totalLessons, totalQuizzesPassed: passedQuizzes, metadata: { generatedBy } },
    create: { uuid: verifyUuid, userId: attempt.userId, courseId: attempt.quiz.courseId, quizAttemptId: attempt.id, pdfUrl: relativePath, pdfContent: Buffer.from(bytes), finalScore: attempt.scorePercent, completionPercent: 100, totalLessons, totalQuizzesPassed: passedQuizzes, metadata: { generatedBy } },
  });
}

export type GenerateCertificateForCourseCompletionParams = {
  userId: string; courseId: string; generatedBy: string;
};

export async function generateCertificateForCourseCompletion({
  userId, courseId, generatedBy,
}: GenerateCertificateForCourseCompletionParams) {
  const { eligible, reason } = await checkCertificateEligibility(userId, courseId);
  if (!eligible) throw new Error(reason ?? "Sertifikat olish uchun shartlar bajarilmagan.");

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
    prisma.course.findUnique({ where: { id: courseId }, include: { modules: { include: { lessons: true } } } }),
  ]);
  if (!user || !course) throw new Error("Foydalanuvchi yoki kurs topilmadi.");

  const totalLessons  = course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const passedQuizzes = await prisma.quizAttempt.count({
    where: { userId, quiz: { courseId }, status: AttemptStatus.PASSED },
  });

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } }, select: { uuid: true },
  });
  const verifyUuid = existing?.uuid ?? crypto.randomUUID();
  const baseUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://eduhistory.uz").replace(/\/$/, "");

  const cs = await prisma.certificateSettings.findUnique({
    where: { id: CERTIFICATE_SETTINGS_ID }, select: { logoUrl: true, signatureUrl: true },
  });

  const bytes = await buildProCertificatePdf({
    studentName:    user.fullName,
    courseTitle:    course.title,
    courseCategory: (course as { category?: string }).category ?? "",
    finalScore:     100,
    totalLessons,
    passedQuizzes,
    issuedDate:     new Date(),
    verifyUrl:      `${baseUrl}/sertifikat/${verifyUuid}`,
    logoUrl:        cs?.logoUrl,
    signatureUrl:   cs?.signatureUrl,
  });

  const fileName     = `certificate-completion-${userId}-${courseId}.pdf`.replace(/[^a-zA-Z0-9-_.]/g, "_");
  const relativePath = `/certificates/${fileName}`;
  const outputDir    = join(process.cwd(), "public", "certificates");
  await mkdir(outputDir, { recursive: true })
    .then(() => writeFile(join(outputDir, fileName), bytes))
    .catch(() => {});

  const pdfContent = Buffer.from(bytes);
  const certData = { pdfUrl: relativePath, pdfContent, finalScore: 100, completionPercent: 100, totalLessons, totalQuizzesPassed: passedQuizzes, metadata: { generatedBy } as object };

  if (existing) return prisma.certificate.update({ where: { userId_courseId: { userId, courseId } }, data: certData });

  try {
    return await prisma.certificate.create({
      data: { uuid: verifyUuid, user: { connect: { id: userId } }, course: { connect: { id: courseId } }, ...certData },
    });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    if (msg.includes("quizAttempt") || msg.includes("user") || msg.includes("missing")) {
      const id = `cert_${verifyUuid.replace(/-/g, "").slice(0, 22)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Certificate" ("id","uuid","userId","courseId","quizAttemptId","pdfUrl","pdfContent","finalScore","completionPercent","totalLessons","totalQuizzesPassed","metadata","issuedAt")
         VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
         ON CONFLICT ("userId","courseId") DO UPDATE SET "pdfUrl"=EXCLUDED."pdfUrl","pdfContent"=EXCLUDED."pdfContent","finalScore"=EXCLUDED."finalScore","completionPercent"=EXCLUDED."completionPercent","totalLessons"=EXCLUDED."totalLessons","totalQuizzesPassed"=EXCLUDED."totalQuizzesPassed","metadata"=EXCLUDED."metadata"`,
        id, verifyUuid, userId, courseId, relativePath, pdfContent, 100, 100,
        totalLessons, passedQuizzes, JSON.stringify({ generatedBy })
      );
      const rows = await prisma.$queryRawUnsafe<Array<{ id:string;uuid:string;userId:string;courseId:string;quizAttemptId:string|null;pdfUrl:string|null;finalScore:number;completionPercent:number;totalLessons:number;totalQuizzesPassed:number;metadata:unknown;issuedAt:Date }>>(
        `SELECT "id","uuid","userId","courseId","quizAttemptId","pdfUrl","finalScore","completionPercent","totalLessons","totalQuizzesPassed","metadata","issuedAt" FROM "Certificate" WHERE "userId"=$1 AND "courseId"=$2`,
        userId, courseId
      );
      const cert = rows[0];
      if (!cert) throw new Error("Sertifikat yaratildi lekin o'qib bo'lmadi.");
      return cert;
    }
    throw err;
  }
}

/**
 * Mavjud sertifikatni UUID orqali qayta generatsiya qiladi.
 * Eligibility tekshirilmaydi — faqat egasi chaqira oladi.
 */
export async function regenerateCertificateByUuid(uuid: string, requestingUserId: string) {
  const cert = await prisma.certificate.findUnique({
    where: { uuid },
    include: {
      user: { select: { fullName: true } },
      course: { include: { modules: { include: { lessons: true } } } },
      quizAttempt: { select: { scorePercent: true } },
    },
  });

  if (!cert) throw new Error("Sertifikat topilmadi.");
  if (cert.userId !== requestingUserId) throw new Error("Bu sertifikat sizga tegishli emas.");

  const cs = await prisma.certificateSettings.findUnique({
    where: { id: CERTIFICATE_SETTINGS_ID }, select: { logoUrl: true, signatureUrl: true },
  });

  const baseUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://eduhistory.uz").replace(/\/$/, "");
  const totalLessons = cert.course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const passedQuizzes = await prisma.quizAttempt.count({
    where: { userId: cert.userId, quiz: { courseId: cert.courseId }, status: AttemptStatus.PASSED },
  });

  const bytes = await buildProCertificatePdf({
    studentName:    cert.user.fullName,
    courseTitle:    cert.course.title,
    courseCategory: (cert.course as { category?: string }).category ?? "",
    finalScore:     cert.quizAttempt?.scorePercent ?? cert.finalScore,
    totalLessons,
    passedQuizzes,
    issuedDate:     cert.issuedAt,
    verifyUrl:      `${baseUrl}/sertifikat/${uuid}`,
    logoUrl:        cs?.logoUrl,
    signatureUrl:   cs?.signatureUrl,
  });

  const fileName     = `certificate-regen-${uuid}.pdf`;
  const relativePath = `/certificates/${fileName}`;
  await mkdir(join(process.cwd(), "public", "certificates"), { recursive: true })
    .then(() => writeFile(join(process.cwd(), "public", "certificates", fileName), bytes))
    .catch(() => {});

  return prisma.certificate.update({
    where: { uuid },
    data: { pdfUrl: relativePath, pdfContent: Buffer.from(bytes) },
  });
}
