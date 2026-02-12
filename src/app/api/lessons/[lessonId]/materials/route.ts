import { MaterialType, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addMaterialSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(0),
});

function mimeToMaterialType(mime: string): MaterialType {
  if (mime === "application/pdf") return MaterialType.PDF;
  if (mime.includes("wordprocessingml") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    return MaterialType.DOCX;
  if (mime.includes("presentationml") || mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    return MaterialType.PPTX;
  if (mime === "application/zip") return MaterialType.ZIP;
  if (mime.startsWith("image/")) return MaterialType.IMAGE;
  if (mime.startsWith("video/")) return MaterialType.VIDEO;
  return MaterialType.OTHER;
}

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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
    return NextResponse.json({ message: "Bu darsga material qo'shishga ruxsat yo'q." }, { status: 403 });
  }

  const parsed = addMaterialSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Material ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const material = await prisma.lessonMaterial.create({
    data: {
      lessonId,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      type: mimeToMaterialType(parsed.data.mimeType),
    },
  });

  return NextResponse.json(material, { status: 201 });
}
