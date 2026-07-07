#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const outRoot = path.join(root, "play-store-assets");
const coverPath = path.join(root, "public", "images", "it.jpg");

const colors = {
  emerald: "#047857",
  emeraldDark: "#065f46",
  teal: "#0d9488",
  cyan: "#0891b2",
  sky: "#2563eb",
  amber: "#f59e0b",
  gold: "#d97706",
  slate: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f8fafc",
  white: "#ffffff",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dataUri(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const bytes = fs.readFileSync(filePath);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const mime = isPng ? "image/png" : isJpeg ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

const coverData = dataUri(coverPath);

function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, size, color = colors.slate, weight = 700, lineHeight = Math.round(size * 1.22), anchor = "start") {
  return lines
    .map((line, index) => {
      const yy = y + index * lineHeight;
      return `<text x="${x}" y="${yy}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(line)}</text>`;
    })
    .join("");
}

function pill(x, y, w, h, label, fill, color = colors.emeraldDark, stroke = "none", size = 24) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}"/>
  <text x="${x + w / 2}" y="${y + h / 2 + size / 3}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" text-anchor="middle">${esc(label)}</text>`;
}

function logoMark(x, y, size) {
  const s = size / 128;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect width="128" height="128" rx="30" fill="url(#logoBg)"/>
    <path d="M25 36C25 31.58 28.58 28 33 28H84C88.42 28 92 31.58 92 36V89C92 93.42 88.42 97 84 97H33C28.58 97 25 93.42 25 89V36Z" fill="white"/>
    <path d="M41 45H75V52H41V45ZM41 60H80V67H41V60ZM41 75H67V82H41V75Z" fill="#065f46"/>
    <path d="M84 39L84 87" stroke="#a7f3d0" stroke-width="5" stroke-linecap="round"/>
    <circle cx="88" cy="88" r="19" fill="#10b981"/>
    <path d="M78 88L85 95L99 80" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function defs(extra = "") {
  return `<defs>
    <linearGradient id="logoBg" x1="12" y1="8" x2="118" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#064e3b"/>
      <stop offset="0.52" stop-color="#059669"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <linearGradient id="storeBg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#f8fafc"/>
      <stop offset="0.38" stop-color="#ecfdf5"/>
      <stop offset="0.74" stop-color="#eef2ff"/>
      <stop offset="1" stop-color="#fff7ed"/>
    </linearGradient>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#ecfdf5"/>
      <stop offset="0.55" stop-color="#ccfbf1"/>
      <stop offset="1" stop-color="#dbeafe"/>
    </linearGradient>
    <linearGradient id="greenButton" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#059669"/>
      <stop offset="1" stop-color="#14b8a6"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    ${extra}
  </defs>`;
}

function card(x, y, w, h, rx = 28, fill = colors.white, stroke = colors.line) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" filter="url(#cardShadow)"/>`;
}

function miniChart(x, y, w, h) {
  const bars = [0.45, 0.7, 0.55, 0.86, 0.62, 0.78, 0.91];
  const bw = w / (bars.length * 1.65);
  return `<g>${bars
    .map((v, i) => {
      const bh = h * v;
      const bx = x + i * bw * 1.65;
      return `<rect x="${bx}" y="${y + h - bh}" width="${bw}" height="${bh}" rx="${bw / 2}" fill="${i % 3 === 0 ? colors.emerald : i % 3 === 1 ? colors.cyan : colors.amber}"/>`;
    })
    .join("")}</g>`;
}

function courseCover(x, y, w, h, id) {
  if (!coverData) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="url(#heroGrad)"/>`;
  }
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28"/></clipPath>
  <image href="${coverData}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#0f172a" opacity="0.30"/>`;
}

function appHeader(w) {
  return `<g>
    <rect x="0" y="0" width="${w}" height="86" fill="white"/>
    ${logoMark(24, 18, 50)}
    <text x="88" y="53" fill="${colors.emeraldDark}" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="800">Eduhistory</text>
    <circle cx="${w - 92}" cy="44" r="23" fill="#f1f5f9"/>
    <path d="M${w - 101} 45h18M${w - 92} 36v18" stroke="#475569" stroke-width="4" stroke-linecap="round"/>
    <rect x="${w - 60}" y="21" width="40" height="46" rx="15" fill="#fff7ed" stroke="#fed7aa"/>
    <text x="${w - 40}" y="53" fill="${colors.gold}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" text-anchor="middle">0</text>
    <line x1="0" y1="86" x2="${w}" y2="86" stroke="${colors.line}"/>
  </g>`;
}

function appScreen(kind, sw, sh, id) {
  const bodyTop = 110;
  if (kind === "landing") {
    return `${appHeader(sw)}
      <rect x="26" y="${bodyTop}" width="${sw - 52}" height="390" rx="32" fill="url(#heroGrad)" stroke="#d1fae5"/>
      ${pill(52, bodyTop + 45, 250, 44, "Premium LMS tajribasi", "#d1fae5", colors.emeraldDark, "#a7f3d0", 20)}
      ${textBlock(["Zamonaviy kurslar", "uchun professional", "LMS"], 52, bodyTop + 130, 42, colors.slate, 800, 52)}
      ${textBlock(wrap("Kurslar, testlar, progress va sertifikatlar bitta qulay platformada.", 32), 52, bodyTop + 300, 20, colors.muted, 500, 30)}
      <rect x="52" y="${bodyTop + 330}" width="${sw - 104}" height="58" rx="18" fill="url(#greenButton)"/>
      <text x="${sw / 2}" y="${bodyTop + 367}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" text-anchor="middle">Bepul boshlash</text>
      ${card(26, 540, sw - 52, 210, 28)}
      ${textBlock(["Boshqaruv paneli"], 56, 596, 28, colors.slate, 800)}
      ${miniChart(56, 640, sw - 112, 72)}
      ${pill(56, 730, 130, 36, "98% pass", "#dcfce7", colors.emeraldDark, "none", 16)}
      ${pill(204, 730, 160, 36, "Real vaqt", "#dbeafe", colors.sky, "none", 16)}`;
  }

  if (kind === "catalog") {
    return `${appHeader(sw)}
      ${textBlock(["Kurslar katalogi"], 30, bodyTop + 42, 40, colors.slate, 800)}
      ${textBlock(wrap("Nashr qilingan kurslarni tanlang va o'qishni boshlang.", 34), 30, bodyTop + 88, 21, colors.muted, 500, 30)}
      ${card(30, bodyTop + 175, sw - 60, 650, 30)}
      ${courseCover(58, bodyTop + 205, sw - 116, 245, `${id}-cover`)}
      ${pill(82, bodyTop + 480, 145, 40, "Pedagogika", "#d1fae5", colors.emeraldDark, "none", 17)}
      ${pill(242, bodyTop + 480, 155, 40, "Boshlang'ich", "#fef3c7", "#b45309", "none", 17)}
      ${textBlock(["RAQAMLI TARIX", "LABORATORIYASI"], 82, bodyTop + 565, 28, colors.slate, 800, 36)}
      ${textBlock(["6 modul", "19 dars", "24 talaba"], 82, bodyTop + 655, 22, colors.muted, 600, 38)}
      <rect x="82" y="${bodyTop + 755}" width="${sw - 164}" height="60" rx="18" fill="url(#greenButton)"/>
      <text x="${sw / 2}" y="${bodyTop + 793}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="800" text-anchor="middle">Batafsil ko'rish</text>`;
  }

  if (kind === "course") {
    return `${appHeader(sw)}
      ${courseCover(30, bodyTop, sw - 60, 310, `${id}-hero`)}
      ${pill(58, bodyTop + 212, 145, 44, "Pedagogika", "rgba(255,255,255,0.80)", colors.slate, "rgba(255,255,255,0.75)", 17)}
      ${pill(218, bodyTop + 212, 160, 44, "Boshlang'ich", "#10b981", "white", "none", 17)}
      ${textBlock(["RAQAMLI TARIX", "LABORATORIYASI"], 58, bodyTop + 270, 34, "white", 900, 42)}
      ${card(30, bodyTop + 350, sw - 60, 300, 30)}
      ${pill(70, bodyTop + 398, 130, 44, "19 dars", "#f1f5f9", colors.muted, "none", 18)}
      ${pill(220, bodyTop + 398, 130, 44, "5 soat", "#f1f5f9", colors.muted, "none", 18)}
      ${pill(70, bodyTop + 470, 310, 44, "24 talaba", "#d1fae5", colors.emeraldDark, "none", 18)}
      <rect x="70" y="${bodyTop + 545}" width="${sw - 140}" height="64" rx="18" fill="url(#greenButton)"/>
      <text x="${sw / 2}" y="${bodyTop + 585}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" text-anchor="middle">Kursni davom ettirish</text>
      ${card(30, bodyTop + 690, sw - 60, 165, 30)}
      ${textBlock(["Kurs haqida"], 70, bodyTop + 760, 30, colors.slate, 800)}
      ${textBlock(wrap("Video darslar, testlar va sertifikatga olib boradigan progress.", 36), 70, bodyTop + 808, 18, colors.muted, 500, 26)}`;
  }

  if (kind === "certificate") {
    return `${appHeader(sw)}
      ${textBlock(["Sertifikatlar"], 30, bodyTop + 45, 40, colors.slate, 800)}
      ${textBlock(wrap("Kursni yakunlang, testdan o'ting va QR bilan tasdiqlanadigan sertifikat oling.", 38), 30, bodyTop + 92, 20, colors.muted, 500, 30)}
      <rect x="30" y="${bodyTop + 190}" width="${sw - 60}" height="420" rx="28" fill="#fffdf7" stroke="#facc15" filter="url(#cardShadow)"/>
      <rect x="58" y="${bodyTop + 218}" width="${sw - 116}" height="364" rx="18" fill="none" stroke="#d97706" stroke-width="2"/>
      ${logoMark(82, bodyTop + 250, 62)}
      ${textBlock(["EDUHISTORY", "SERTIFIKATI"], sw / 2, bodyTop + 300, 32, colors.slate, 900, 38, "middle")}
      ${textBlock(["Raqamli tarix laboratoriyasi"], sw / 2, bodyTop + 385, 22, colors.gold, 700, 28, "middle")}
      ${textBlock(["Maxfuza Soataliyevna"], sw / 2, bodyTop + 445, 28, colors.slate, 800, 34, "middle")}
      <rect x="${sw - 160}" y="${bodyTop + 480}" width="72" height="72" rx="12" fill="#f1f5f9"/>
      <path d="M${sw - 143} ${bodyTop + 497}h38v38h-38zM${sw - 136} ${bodyTop + 504}h10v10h-10zM${sw - 113} ${bodyTop + 504}h10v10h-10zM${sw - 136} ${bodyTop + 527}h10v10h-10z" fill="${colors.slate}"/>
      <rect x="58" y="${bodyTop + 650}" width="${sw - 116}" height="66" rx="20" fill="url(#greenButton)"/>
      <text x="${sw / 2}" y="${bodyTop + 692}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="800" text-anchor="middle">Sertifikatni ulashish</text>`;
  }

  if (kind === "analytics") {
    return `${appHeader(sw)}
      ${textBlock(["Kurs statistikasi"], 30, bodyTop + 45, 38, colors.slate, 800)}
      ${textBlock(wrap("Enrollment, completion va quiz natijalari real vaqtga yaqin ko'rinadi.", 38), 30, bodyTop + 88, 20, colors.muted, 500, 30)}
      ${card(30, bodyTop + 160, sw - 60, 148, 28)}
      ${textBlock(["Talabalar"], 72, bodyTop + 220, 21, colors.muted, 700)}
      ${textBlock(["234"], 72, bodyTop + 280, 42, colors.slate, 900)}
      ${pill(sw - 210, bodyTop + 220, 140, 42, "+18%", "#dcfce7", colors.emeraldDark, "none", 18)}
      ${card(30, bodyTop + 335, sw - 60, 148, 28)}
      ${textBlock(["Completion"], 72, bodyTop + 395, 21, colors.muted, 700)}
      ${textBlock(["86.4%"], 72, bodyTop + 455, 42, colors.slate, 900)}
      ${pill(sw - 230, bodyTop + 395, 160, 42, "Premium", "#dbeafe", colors.sky, "none", 18)}
      ${card(30, bodyTop + 520, sw - 60, 310, 28)}
      ${textBlock(["Quiz o'rtacha ball"], 72, bodyTop + 585, 24, colors.slate, 800)}
      ${miniChart(72, bodyTop + 630, sw - 144, 150)}
      <line x1="72" y1="${bodyTop + 805}" x2="${sw - 72}" y2="${bodyTop + 805}" stroke="${colors.line}"/>`;
  }

  return `${appHeader(sw)}
    ${textBlock(["Mening kurslarim"], 30, bodyTop + 45, 40, colors.slate, 800)}
    ${card(30, bodyTop + 130, sw - 60, 235, 28)}
    ${textBlock(["PEDAGOGIKA TARIXI"], 70, bodyTop + 202, 29, colors.slate, 800)}
    ${textBlock(["Tugatilgan darslar: 9/15"], 70, bodyTop + 255, 21, colors.muted, 600)}
    <rect x="70" y="${bodyTop + 288}" width="${sw - 140}" height="16" rx="8" fill="#e2e8f0"/>
    <rect x="70" y="${bodyTop + 288}" width="${(sw - 140) * 0.62}" height="16" rx="8" fill="url(#greenButton)"/>
    ${card(30, bodyTop + 405, sw - 60, 350, 28)}
    ${textBlock(["Darslar jadvali"], 70, bodyTop + 470, 30, colors.slate, 800)}
    ${["Kirish", "Qadimgi tarix", "Test", "Sertifikat"].map((label, index) => {
      const yy = bodyTop + 520 + index * 54;
      return `<circle cx="86" cy="${yy - 8}" r="13" fill="${index < 2 ? "#10b981" : "#e2e8f0"}"/>
        <text x="118" y="${yy}" fill="${index < 2 ? colors.slate : colors.muted}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${esc(label)}</text>`;
    }).join("")}
    <rect x="70" y="${bodyTop + 700}" width="${sw - 140}" height="60" rx="18" fill="url(#greenButton)"/>
    <text x="${sw / 2}" y="${bodyTop + 738}" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="800" text-anchor="middle">O'qishni davom ettirish</text>`;
}

function deviceFrame(x, y, w, h, inner, id, type = "phone") {
  const radius = type === "phone" ? 58 : 42;
  const bezel = type === "phone" ? 20 : 18;
  const notch = type === "phone" ? `<rect x="${x + w / 2 - 92}" y="${y + 18}" width="184" height="34" rx="17" fill="#0f172a"/>` : "";
  const sw = w - bezel * 2;
  const sh = h - bezel * 2;
  return `<g filter="url(#softShadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#0f172a"/>
    <rect x="${x + bezel}" y="${y + bezel}" width="${sw}" height="${sh}" rx="${radius - 18}" fill="#f8fafc"/>
    <clipPath id="${id}"><rect x="0" y="0" width="${sw}" height="${sh}" rx="${radius - 18}"/></clipPath>
    <g clip-path="url(#${id})" transform="translate(${x + bezel} ${y + bezel})">${inner}</g>
    ${notch}
  </g>`;
}

function phoneScreenshot({ file, title, subtitle, kind, accent }) {
  const w = 1080;
  const h = 1920;
  const phoneW = 600;
  const phoneH = 1180;
  const screen = appScreen(kind, phoneW - 40, phoneH - 40, file);
  const titleLines = wrap(title, 22);
  const subtitleLines = wrap(subtitle, 43);
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="${w}" height="${h}" fill="url(#storeBg)"/>
    <circle cx="100" cy="270" r="150" fill="${accent}" opacity="0.18"/>
    <circle cx="980" cy="500" r="230" fill="#0ea5e9" opacity="0.12"/>
    ${logoMark(80, 78, 72)}
    <text x="170" y="126" fill="${colors.emeraldDark}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900">Eduhistory</text>
    ${textBlock(titleLines, 80, 240, 62, colors.slate, 900, 74)}
    ${textBlock(subtitleLines, 80, 240 + titleLines.length * 74 + 34, 30, colors.muted, 500, 42)}
    ${deviceFrame(240, 640, phoneW, phoneH, screen, `${file}-phone`)}
    <rect x="80" y="1760" width="920" height="72" rx="24" fill="white" stroke="${colors.line}"/>
    <text x="540" y="1807" fill="${colors.emeraldDark}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" text-anchor="middle">Kurslar, testlar va sertifikatlar bir joyda</text>
  </svg>`;
  return renderSvg(svg, path.join(outRoot, "phone", file));
}

function tabletScreenshot({ dir, file, width, height, title, subtitle, kind, side }) {
  const tabletW = Math.round(width * 0.54);
  const tabletH = Math.round(height * 0.70);
  const tabletX = side === "right" ? width - tabletW - 110 : 110;
  const tabletY = Math.round(height * 0.17);
  const textX = side === "right" ? 110 : width - Math.round(width * 0.39);
  const screen = appScreen(kind, tabletW - 36, tabletH - 36, file);
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="${width}" height="${height}" fill="url(#storeBg)"/>
    <circle cx="${width - 180}" cy="180" r="230" fill="#10b981" opacity="0.13"/>
    <circle cx="180" cy="${height - 160}" r="260" fill="#2563eb" opacity="0.10"/>
    ${logoMark(textX, 88, 72)}
    <text x="${textX + 94}" y="136" fill="${colors.emeraldDark}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900">Eduhistory</text>
    ${textBlock(wrap(title, 20), textX, 260, Math.round(width * 0.035), colors.slate, 900, Math.round(width * 0.043))}
    ${textBlock(wrap(subtitle, 38), textX, 430, Math.round(width * 0.016), colors.muted, 500, Math.round(width * 0.024))}
    ${pill(textX, height - 210, 330, 62, "Play Store ready", "#dcfce7", colors.emeraldDark, "none", 26)}
    ${deviceFrame(tabletX, tabletY, tabletW, tabletH, screen, `${file}-tablet`, "tablet")}
  </svg>`;
  return renderSvg(svg, path.join(outRoot, dir, file));
}

function iconSvg(size = 512) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="${size}" height="${size}" fill="#064e3b"/>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#logoBg)"/>
    <circle cx="${Math.round(size * 0.14)}" cy="${Math.round(size * 0.12)}" r="${Math.round(size * 0.22)}" fill="#34d399" opacity="0.25"/>
    <circle cx="${Math.round(size * 0.90)}" cy="${Math.round(size * 0.86)}" r="${Math.round(size * 0.28)}" fill="#38bdf8" opacity="0.16"/>
    <rect x="${Math.round(size * 0.22)}" y="${Math.round(size * 0.20)}" width="${Math.round(size * 0.46)}" height="${Math.round(size * 0.56)}" rx="${Math.round(size * 0.055)}" fill="white"/>
    <rect x="${Math.round(size * 0.30)}" y="${Math.round(size * 0.32)}" width="${Math.round(size * 0.27)}" height="${Math.round(size * 0.035)}" rx="${Math.round(size * 0.017)}" fill="${colors.emeraldDark}"/>
    <rect x="${Math.round(size * 0.30)}" y="${Math.round(size * 0.43)}" width="${Math.round(size * 0.32)}" height="${Math.round(size * 0.035)}" rx="${Math.round(size * 0.017)}" fill="${colors.emeraldDark}"/>
    <rect x="${Math.round(size * 0.30)}" y="${Math.round(size * 0.54)}" width="${Math.round(size * 0.23)}" height="${Math.round(size * 0.035)}" rx="${Math.round(size * 0.017)}" fill="${colors.emeraldDark}"/>
    <path d="M${Math.round(size * 0.66)} ${Math.round(size * 0.23)}V${Math.round(size * 0.72)}" stroke="#a7f3d0" stroke-width="${Math.round(size * 0.045)}" stroke-linecap="round"/>
    <circle cx="${Math.round(size * 0.70)}" cy="${Math.round(size * 0.70)}" r="${Math.round(size * 0.15)}" fill="#10b981"/>
    <path d="M${Math.round(size * 0.62)} ${Math.round(size * 0.70)}L${Math.round(size * 0.68)} ${Math.round(size * 0.76)}L${Math.round(size * 0.80)} ${Math.round(size * 0.62)}" fill="none" stroke="white" stroke-width="${Math.round(size * 0.045)}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function featureGraphic() {
  const w = 1024;
  const h = 500;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <rect width="${w}" height="${h}" fill="url(#storeBg)"/>
    <circle cx="860" cy="92" r="168" fill="#10b981" opacity="0.17"/>
    <circle cx="116" cy="424" r="178" fill="#2563eb" opacity="0.10"/>
    ${logoMark(70, 70, 82)}
    <text x="170" y="122" fill="${colors.emeraldDark}" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="900">Eduhistory</text>
    ${textBlock(["Professional LMS", "kurslar va testlar", "sertifikatlar uchun"], 70, 205, 44, colors.slate, 900, 52)}
    ${textBlock(["Mobil ilova, PWA va web platforma bitta tizimda ishlaydi."], 70, 392, 24, colors.muted, 500)}
    ${card(660, 96, 270, 300, 32)}
    ${miniChart(702, 160, 186, 96)}
    ${pill(702, 284, 170, 42, "234 talaba", "#dcfce7", colors.emeraldDark, "none", 18)}
    ${pill(702, 340, 150, 42, "14 sertifikat", "#fef3c7", "#b45309", "none", 18)}
  </svg>`;
  return renderSvg(svg, path.join(outRoot, "feature-graphic-1024x500.png"));
}

async function renderSvg(svg, output) {
  ensureDir(path.dirname(output));
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output);
}

async function writeIcons() {
  const appIcon = await sharp(Buffer.from(iconSvg(512))).png({ compressionLevel: 9 }).toBuffer();
  ensureDir(path.join(outRoot, "icon"));
  await sharp(appIcon).toFile(path.join(outRoot, "icon", "app-icon-512.png"));
  await sharp(appIcon).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(path.join(outRoot, "icon", "app-icon-1024.png"));
  await sharp(appIcon).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icons", "icon-512.png"));
  await sharp(appIcon).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icons", "icon-192.png"));
  await sharp(appIcon).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icons", "maskable-512.png"));
  await sharp(appIcon).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icons", "maskable-192.png"));
  await sharp(appIcon).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icons", "apple-touch-icon.png"));

  const densities = [
    ["mipmap-mdpi", 48],
    ["mipmap-hdpi", 72],
    ["mipmap-xhdpi", 96],
    ["mipmap-xxhdpi", 144],
    ["mipmap-xxxhdpi", 192],
  ];
  for (const [dir, size] of densities) {
    const target = path.join(root, "android", "app", "src", "main", "res", dir);
    ensureDir(target);
    await sharp(appIcon).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(target, "ic_launcher.png"));
    await sharp(appIcon).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(target, "ic_launcher_round.png"));
  }
}

async function writeShortcutIcons() {
  const course = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">${defs()}<rect width="192" height="192" rx="42" fill="url(#heroGrad)"/><path d="M50 56h66a18 18 0 0 1 18 18v62H68a18 18 0 0 1-18-18V56Z" fill="white" stroke="#a7f3d0" stroke-width="5"/><path d="M72 78h38M72 98h48M72 118h28" stroke="${colors.emeraldDark}" stroke-width="9" stroke-linecap="round"/></svg>`;
  const certificate = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">${defs()}<rect width="192" height="192" rx="42" fill="#fff7ed"/><rect x="40" y="48" width="112" height="88" rx="16" fill="white" stroke="#f59e0b" stroke-width="6"/><path d="M66 78h60M66 100h42" stroke="${colors.slate}" stroke-width="8" stroke-linecap="round"/><circle cx="134" cy="130" r="22" fill="#10b981"/><path d="M123 130l8 8 16-19" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  await renderSvg(course, path.join(root, "public", "icons", "shortcut-courses.png"));
  await renderSvg(certificate, path.join(root, "public", "icons", "shortcut-certificates.png"));
}

async function writeReadme() {
  const readme = `# Eduhistory Play Store assets

Generated Play Console graphics for Eduhistory.

## Files

- \`icon/app-icon-512.png\` - app icon, 512 x 512 PNG.
- \`feature-graphic-1024x500.png\` - feature graphic / description image, 1024 x 500 PNG.
- \`phone/*.png\` - smartphone screenshots, 1080 x 1920 PNG, 9:16 ratio.
- \`tablet-7/*.png\` - 7-inch tablet screenshots, 1920 x 1080 PNG, 16:9 ratio.
- \`tablet-10/*.png\` - 10-inch tablet screenshots, 2560 x 1440 PNG, 16:9 ratio.

These files are prepared for the Google Play Console Graphics section.
`;
  fs.writeFileSync(path.join(outRoot, "README.md"), readme);
}

async function main() {
  ensureDir(outRoot);
  await writeIcons();
  await writeShortcutIcons();
  await featureGraphic();

  const phones = [
    ["01-welcome-lms.png", "Zamonaviy LMS", "Kurslar, testlar va sertifikatlar mobil ilovada qulay ishlaydi.", "landing", "#10b981"],
    ["02-course-catalog.png", "Kurslarni toping", "Pedagogika, IT va robototexnika kurslarini bitta katalogdan tanlang.", "catalog", "#0ea5e9"],
    ["03-course-detail.png", "O'qishni davom ettiring", "Darslar, modullar va progress har doim qo'lingizda.", "course", "#f59e0b"],
    ["04-digital-certificates.png", "Raqamli sertifikat", "Kursni yakunlab, ulashish mumkin bo'lgan sertifikat oling.", "certificate", "#8b5cf6"],
    ["05-course-analytics.png", "Aniq analitika", "Admin va ustozlar uchun talabalar progressi va test natijalari.", "analytics", "#14b8a6"],
    ["06-learning-progress.png", "Progress nazorati", "Talabalar dars jadvali va natijalarini mobil ko'radi.", "progress", "#2563eb"],
  ];
  for (const [file, title, subtitle, kind, accent] of phones) {
    await phoneScreenshot({ file, title, subtitle, kind, accent });
  }

  const tablet7 = [
    ["01-tablet-dashboard.png", "Planshetda keng boshqaruv", "Kurslar, talabalar va sertifikatlar katta ekranda aniq ko'rinadi.", "analytics", "right"],
    ["02-tablet-course-player.png", "Katta ekranda ta'lim", "Kurs sahifasi, darslar va progress planshetga mos tajribada.", "course", "left"],
  ];
  for (const [file, title, subtitle, kind, side] of tablet7) {
    await tabletScreenshot({ dir: "tablet-7", file, width: 1920, height: 1080, title, subtitle, kind, side });
  }

  const tablet10 = [
    ["01-admin-analytics.png", "Premium admin panel", "Talabalar, completion va quiz statistikasi bir joyda.", "analytics", "right"],
    ["02-certificates-tablet.png", "Sertifikatlarni ulashish", "QR tasdiqli sertifikatlar web va mobil ilovada tayyor.", "certificate", "left"],
  ];
  for (const [file, title, subtitle, kind, side] of tablet10) {
    await tabletScreenshot({ dir: "tablet-10", file, width: 2560, height: 1440, title, subtitle, kind, side });
  }

  await writeReadme();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
