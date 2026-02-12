import { AttemptStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { generateCertificateForPassedFinalAttempt } from "@/lib/certificate-service";
import { prisma } from "@/lib/prisma";

const generateSchema = z.object({
  attemptId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = generateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Sertifikat so'rovi noto'g'ri." }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parsed.data.attemptId },
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

  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ message: "Urinish topilmadi." }, { status: 404 });
  }

  if (!attempt.quiz.isFinal || attempt.status !== AttemptStatus.PASSED) {
    return NextResponse.json({ message: "Sertifikat olish uchun final testdan o'tish kerak." }, { status: 409 });
  }

  const certificate = await generateCertificateForPassedFinalAttempt({
    attemptId: attempt.id,
    expectedUserId: session.user.id,
    generatedBy: "api/certificates/generate",
  });

  return NextResponse.json({
    message: "Sertifikat yaratildi.",
    certificate,
  });
}
