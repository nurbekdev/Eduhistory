import { EnrollmentStatus, ProgressStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const enrollSchema = z.object({
  courseId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Kursga yozilish uchun tizimga kiring." }, { status: 401 });
  }

  const parsed = enrollSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Kurs ma'lumoti noto'g'ri." }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId: parsed.data.courseId,
      },
    },
    update: {
      status: EnrollmentStatus.ACTIVE,
    },
    create: {
      userId: session.user.id,
      courseId: parsed.data.courseId,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  const orderedLessons = course.modules.flatMap((moduleItem) => moduleItem.lessons);

  if (orderedLessons.length > 0) {
    for (const [index, lesson] of orderedLessons.entries()) {
      await prisma.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
          },
        },
        update: {},
        create: {
          enrollmentId: enrollment.id,
          userId: session.user.id,
          lessonId: lesson.id,
          status: index === 0 ? ProgressStatus.UNLOCKED : ProgressStatus.LOCKED,
          unlockedAt: index === 0 ? new Date() : null,
        },
      });
    }
  }

  return NextResponse.json(
    {
      message: "Kursga muvaffaqiyatli yozildingiz.",
      enrollmentId: enrollment.id,
    },
    { status: 201 },
  );
}
