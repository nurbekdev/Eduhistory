import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const certificates = await prisma.$queryRaw<
    Array<{
      id: string;
      uuid: string;
      userId: string;
      courseId: string;
      quizAttemptId: string | null;
      pdfUrl: string | null;
      finalScore: number;
      issuedAt: Date;
      course_id: string;
      course_title: string;
      course_category: string;
    }>
  >`
    SELECT c.id, c.uuid, c."userId", c."courseId", c."quizAttemptId", c."pdfUrl", c."finalScore", c."issuedAt",
           co.id AS "course_id", co.title AS "course_title", co.category AS "course_category"
    FROM "Certificate" c
    JOIN "Course" co ON co.id = c."courseId"
    WHERE c."userId" = ${session.user.id}
    ORDER BY c."issuedAt" DESC
  `;

  const result = certificates.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    userId: row.userId,
    courseId: row.courseId,
    quizAttemptId: row.quizAttemptId,
    pdfUrl: row.pdfUrl,
    finalScore: row.finalScore,
    issuedAt: row.issuedAt,
    course: { id: row.course_id, title: row.course_title, category: row.course_category },
  }));

  return NextResponse.json(result);
}
