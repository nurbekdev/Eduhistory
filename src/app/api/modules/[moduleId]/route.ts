import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateModuleSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  order: z.number().int().min(1).optional(),
});

type RouteContext = {
  params: Promise<{ moduleId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { moduleId } = await context.params;
  const moduleItem = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { instructorId: true, id: true } } },
  });
  if (!moduleItem) {
    return NextResponse.json({ message: "Modul topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && moduleItem.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu modulni tahrirlashga ruxsat yo'q." }, { status: 403 });
  }

  const parsed = updateModuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Modul ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  if (parsed.data.order && parsed.data.order !== moduleItem.order) {
    const target = await prisma.module.findFirst({
      where: {
        courseId: moduleItem.courseId,
        order: parsed.data.order,
      },
    });
    if (target) {
      await prisma.module.update({
        where: { id: target.id },
        data: { order: moduleItem.order },
      });
    }
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      order: parsed.data.order,
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

  const { moduleId } = await context.params;
  const moduleItem = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!moduleItem) {
    return NextResponse.json({ message: "Modul topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && moduleItem.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu modulni o'chirishga ruxsat yo'q." }, { status: 403 });
  }

  await prisma.module.delete({
    where: { id: moduleId },
  });

  return NextResponse.json({ message: "Modul o'chirildi." });
}
