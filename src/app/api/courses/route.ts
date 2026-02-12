import { CourseLevel, CourseStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";

const createCourseSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  durationMinutes: z.number().int().min(0).default(0),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
  instructorId: z.string().min(1).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const courses = await prisma.course.findMany({
    where:
      session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR
        ? undefined
        : {
            status: CourseStatus.PUBLISHED,
          },
    orderBy: { createdAt: "desc" },
    include: {
      instructor: {
        select: { id: true, fullName: true },
      },
      _count: {
        select: {
          enrollments: true,
          modules: true,
        },
      },
    },
  });

  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasRole(session?.user?.role, [Role.ADMIN, Role.INSTRUCTOR])) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createCourseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Kurs ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      category: parsed.data.category,
      level: parsed.data.level,
      durationMinutes: parsed.data.durationMinutes,
      status: parsed.data.status,
      instructorId: parsed.data.instructorId ?? session.user.id,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
