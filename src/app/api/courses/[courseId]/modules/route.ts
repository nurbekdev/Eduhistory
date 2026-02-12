import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createModuleSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { courseId } = await context.params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Faqat o'zingiz yaratgan kursga modul qo'sha olasiz." }, { status: 403 });
  }

  const parsed = createModuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Modul ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const maxOrder = await prisma.module.aggregate({
    where: { courseId },
    _max: { order: true },
  });

  const moduleItem = await prisma.module.create({
    data: {
      courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json(moduleItem, { status: 201 });
}
