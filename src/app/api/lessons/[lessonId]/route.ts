import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toYoutubeEmbedUrl } from "@/lib/youtube";

const updateLessonSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  content: z.string().optional(),
  youtubeUrl: z.string().url().optional(),
  videoFileUrl: z.string().url().optional().or(z.literal("")),
  durationMinutes: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  order: z.number().int().min(1).optional(),
});

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { lessonId } = await context.params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true },
          },
        },
      },
    },
  });
  if (!lesson) {
    return NextResponse.json({ message: "Dars topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && lesson.module.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu darsni tahrirlashga ruxsat yo'q." }, { status: 403 });
  }

  const parsed = updateLessonSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Dars ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  if (parsed.data.order && parsed.data.order !== lesson.order) {
    const target = await prisma.lesson.findFirst({
      where: {
        moduleId: lesson.moduleId,
        order: parsed.data.order,
      },
    });
    if (target) {
      await prisma.lesson.update({
        where: { id: target.id },
        data: { order: lesson.order },
      });
    }
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...parsed.data,
      youtubeUrl: parsed.data.youtubeUrl ? toYoutubeEmbedUrl(parsed.data.youtubeUrl) : undefined,
      videoFileUrl: parsed.data.videoFileUrl === "" ? null : parsed.data.videoFileUrl,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { lessonId } = await context.params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true },
          },
        },
      },
    },
  });
  if (!lesson) {
    return NextResponse.json({ message: "Dars topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && lesson.module.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu darsni o'chirishga ruxsat yo'q." }, { status: 403 });
  }

  await prisma.lesson.delete({
    where: { id: lessonId },
  });
  return NextResponse.json({ message: "Dars o'chirildi." });
}
