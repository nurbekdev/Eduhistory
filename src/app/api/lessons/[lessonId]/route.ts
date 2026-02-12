import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toYoutubeEmbedUrl } from "@/lib/youtube";

const updateLessonSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(5).optional(),
  content: z.union([z.string(), z.null()]).optional().transform((v) => v ?? undefined),
  youtubeUrl: z.union([z.string().url(), z.literal("")]).optional(),
  videoFileUrl: z.union([z.string().url(), z.literal("")]).optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  isPublished: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined)),
  order: z.coerce.number().int().min(1).optional(),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON formati noto'g'ri." }, { status: 400 });
  }

  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const firstIssue = issues.formErrors[0] ?? Object.values(issues.fieldErrors).flat()[0];
    const message =
      typeof firstIssue === "string" ? firstIssue : "Dars ma'lumotlari noto'g'ri.";
    return NextResponse.json(
      { message, errors: issues.fieldErrors },
      { status: 400 },
    );
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
      youtubeUrl:
        parsed.data.youtubeUrl !== undefined
          ? (parsed.data.youtubeUrl ? toYoutubeEmbedUrl(parsed.data.youtubeUrl) : "")
          : undefined,
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
