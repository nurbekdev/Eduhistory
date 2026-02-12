import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toYoutubeEmbedUrl } from "@/lib/youtube";

const createLessonSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  content: z.string().optional(),
  youtubeUrl: z.union([z.string().url(), z.literal("")]).default(""),
  videoFileUrl: z.string().url().optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
});

type RouteContext = {
  params: Promise<{ moduleId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { moduleId } = await context.params;
  const moduleItem = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: {
          id: true,
          instructorId: true,
          defaultAttemptLimit: true,
          defaultPassingScore: true,
        },
      },
    },
  });
  if (!moduleItem) {
    return NextResponse.json({ message: "Modul topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && moduleItem.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu modulga dars qo'shishga ruxsat yo'q." }, { status: 403 });
  }

  const parsed = createLessonSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Dars ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      content: parsed.data.content,
      youtubeUrl: parsed.data.youtubeUrl ? toYoutubeEmbedUrl(parsed.data.youtubeUrl) : "",
      videoFileUrl: parsed.data.videoFileUrl === "" ? null : parsed.data.videoFileUrl,
      durationMinutes: parsed.data.durationMinutes,
      isPublished: parsed.data.isPublished,
      order: (maxOrder._max.order ?? 0) + 1,
      quiz: {
        create: {
          title: `${parsed.data.title} testi`,
          description: "Dars bo'yicha bilimni tekshirish testi.",
          courseId: moduleItem.course.id,
          passingScore: moduleItem.course.defaultPassingScore,
          attemptLimit: moduleItem.course.defaultAttemptLimit,
          createdById: session.user.id,
        },
      },
    },
    include: {
      quiz: true,
    },
  });

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { courseId: moduleItem.course.id, status: "ACTIVE" },
    select: { id: true, userId: true },
  });

  for (const enrollment of activeEnrollments) {
    const existingProgress = await prisma.lessonProgress.findMany({
      where: {
        enrollmentId: enrollment.id,
      },
      select: { status: true },
    });

    const shouldUnlock =
      existingProgress.length === 0 || existingProgress.every((item) => item.status === "COMPLETED");

    await prisma.lessonProgress.create({
      data: {
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        lessonId: lesson.id,
        status: shouldUnlock ? "UNLOCKED" : "LOCKED",
        unlockedAt: shouldUnlock ? new Date() : null,
      },
    });
  }

  return NextResponse.json(lesson, { status: 201 });
}
