import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ lessonId: string; materialId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { lessonId, materialId } = await context.params;
  const material = await prisma.lessonMaterial.findFirst({
    where: { id: materialId, lessonId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { instructorId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!material) {
    return NextResponse.json({ message: "Material topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && material.lesson.module.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu materialni o'chirishga ruxsat yo'q." }, { status: 403 });
  }

  await prisma.lessonMaterial.delete({
    where: { id: materialId },
  });

  return NextResponse.json({ message: "Material o'chirildi." });
}
