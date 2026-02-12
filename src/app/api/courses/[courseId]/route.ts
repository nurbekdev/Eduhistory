import { CourseLevel, CourseStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";

const updateCourseSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(2).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  durationMinutes: z.number().int().min(0).optional(),
  defaultPassingScore: z.number().int().min(0).max(100).optional(),
  defaultAttemptLimit: z.number().int().min(1).max(10).optional(),
  status: z.nativeEnum(CourseStatus).optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const { courseId } = await context.params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { id: true, fullName: true, email: true },
      },
      modules: {
        include: {
          lessons: {
            include: {
              materials: true,
              quiz: {
                include: {
                  questions: {
                    include: {
                      options: {
                        orderBy: { order: "asc" },
                      },
                    },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      quizzes: {
        where: { isFinal: true },
        include: {
          questions: {
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }

  if (
    session?.user?.role !== Role.ADMIN &&
    session?.user?.role !== Role.INSTRUCTOR &&
    course.status !== CourseStatus.PUBLISHED
  ) {
    return NextResponse.json({ message: "Kurs hozircha nashr qilinmagan." }, { status: 403 });
  }

  return NextResponse.json(course);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!hasRole(session?.user?.role, [Role.ADMIN, Role.INSTRUCTOR])) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { courseId } = await context.params;
  const existing = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }
  if (session?.user?.role !== Role.ADMIN && existing.instructorId !== session?.user?.id) {
    return NextResponse.json({ message: "Faqat o'zingiz yaratgan kursni tahrirlay olasiz." }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = updateCourseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Yangilash ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...parsed.data,
      coverImageUrl: parsed.data.coverImageUrl === "" ? null : parsed.data.coverImageUrl,
      publishedAt:
        parsed.data.status === CourseStatus.PUBLISHED
          ? new Date()
          : parsed.data.status === CourseStatus.DRAFT
            ? null
            : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !hasRole(session?.user?.role, [Role.ADMIN, Role.INSTRUCTOR])) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { courseId } = await context.params;
  const existing = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && existing.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Faqat o'zingiz yaratgan kursni o'chira olasiz." }, { status: 403 });
  }

  await prisma.course.delete({
    where: { id: courseId },
  });
  return NextResponse.json({ message: "Kurs o'chirildi." });
}
