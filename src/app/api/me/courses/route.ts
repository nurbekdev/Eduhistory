import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      course: {
        include: {
          instructor: {
            select: { fullName: true },
          },
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
      progress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  const data = enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.modules.reduce((acc, moduleItem) => acc + moduleItem.lessons.length, 0);
    const completed = enrollment.progress.filter((item) => item.status === "COMPLETED").length;
    const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
    return {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      progressPercent: percent,
      completedLessons: completed,
      totalLessons,
      course: {
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        description: enrollment.course.description,
        category: enrollment.course.category,
        level: enrollment.course.level,
        instructorName: enrollment.course.instructor.fullName,
      },
    };
  });

  return NextResponse.json(data);
}
