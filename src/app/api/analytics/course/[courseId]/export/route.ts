import { Parser } from "json2csv";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
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
  if (session.user.role === Role.INSTRUCTOR && course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu kurs analitikasiga ruxsat yo'q." }, { status: 403 });
  }

  const rows = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: { select: { fullName: true, email: true } },
      attempts: {
        select: {
          scorePercent: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const normalized = rows.map((row) => ({
    talaba: row.user.fullName,
    email: row.user.email,
    holat: row.status,
    urinishlar_soni: row.attempts.length,
    ortacha_ball: row.attempts.length
      ? (row.attempts.reduce((acc, attempt) => acc + attempt.scorePercent, 0) / row.attempts.length).toFixed(2)
      : "0",
  }));

  const csv = new Parser({
    fields: ["talaba", "email", "holat", "urinishlar_soni", "ortacha_ball"],
  }).parse(normalized);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="course-${courseId}-analytics.csv"`,
    },
  });
}
