import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ enrollmentId: string }>;
};

/** POST: reset progress and restart course (delete progress, certificate; set enrollment to ACTIVE) */
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { enrollmentId } = await context.params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true },
  });

  if (!enrollment || enrollment.userId !== session.user.id) {
    return NextResponse.json({ message: "Yozilish topilmadi." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.lessonProgress.deleteMany({
      where: { enrollmentId },
    }),
    prisma.certificate.deleteMany({
      where: {
        userId: session.user.id,
        courseId: enrollment.courseId,
      },
    }),
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "ACTIVE",
        completedAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    courseId: enrollment.courseId,
    message: "Kurs qayta boshlandi.",
  });
}
