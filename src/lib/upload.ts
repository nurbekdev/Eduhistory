const allowedMaterialMimes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

export function validateUpload(file: { type: string; size: number }) {
  const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 50);
  const maxBytes = maxMb * 1024 * 1024;

  if (!allowedMaterialMimes.has(file.type)) {
    return {
      ok: false,
      message: "Fayl turi qo'llab-quvvatlanmaydi.",
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `Fayl hajmi ${maxMb}MB dan oshmasligi kerak.`,
    };
  }

  return { ok: true };
}
