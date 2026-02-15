import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  isOptional: z.boolean().optional(),
  title: z.string().min(1).optional(),
  timeLimitMinutes: z.number().int().min(0).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ quizId: string }> },
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "INSTRUCTOR")) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 401 });
  }

  const { quizId } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Noto'g'ri so'rov." }, { status: 400 });
  }

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(parsed.data.isOptional !== undefined && { isOptional: parsed.data.isOptional }),
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.timeLimitMinutes !== undefined && { timeLimitMinutes: parsed.data.timeLimitMinutes }),
      ...(parsed.data.passingScore !== undefined && { passingScore: parsed.data.passingScore }),
    },
  });

  return NextResponse.json(quiz);
}
