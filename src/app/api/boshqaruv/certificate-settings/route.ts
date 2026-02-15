import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { generateCertificateForPassedFinalAttempt } from "@/lib/certificate-service";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";

const patchSchema = z.object({
  templateType: z.string().max(100).optional(),
  logoUrl: z
    .string()
    .max(500)
    .refine((v) => !v || v.startsWith("http") || v.startsWith("/"), "URL yoki relative path")
    .optional(),
  signatureUrl: z
    .string()
    .max(500)
    .refine((v) => !v || v.startsWith("http") || v.startsWith("/"), "URL yoki relative path")
    .optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  const settings = await prisma.certificateSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  return NextResponse.json(
    settings ?? {
      id: SETTINGS_ID,
      templateType: null,
      logoUrl: null,
      signatureUrl: null,
      verifyUrlFormat: null,
      qrTextField: null,
    }
  );
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON xato." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Noto'g'ri maydonlar." }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if (parsed.data.templateType !== undefined) data.templateType = parsed.data.templateType || null;
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl === "" ? null : parsed.data.logoUrl;
  if (parsed.data.signatureUrl !== undefined)
    data.signatureUrl = parsed.data.signatureUrl === "" ? null : parsed.data.signatureUrl;

  const settings = await prisma.certificateSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  // Faqat attempt orqali yaratilgan sertifikatlarni qayta generatsiya qilish (quizAttemptId bo‘lganlar)
  const certificates = await prisma.$queryRaw<Array<{ quizAttemptId: string | null }>>`
    SELECT "quizAttemptId" FROM "Certificate" WHERE "quizAttemptId" IS NOT NULL
  `;
  for (const cert of certificates) {
    const attemptId = cert.quizAttemptId;
    if (!attemptId) continue;
    try {
      await generateCertificateForPassedFinalAttempt({
        attemptId,
        generatedBy: "certificate-settings-patch",
      });
    } catch (err) {
      console.warn("Sertifikat qayta generatsiya qilinmadi:", attemptId, err);
    }
  }

  return NextResponse.json(settings);
}
