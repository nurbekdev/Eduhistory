import { CourseStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/** GET: list reviews for a course (public for published course) */
export async function GET(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(5, Number(url.searchParams.get("limit")) || 10));
  const skip = (page - 1) * limit;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true },
  });
  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const canView = course.status === CourseStatus.PUBLISHED ||
    session?.user?.role === Role.ADMIN ||
    session?.user?.role === Role.INSTRUCTOR;
  if (!canView) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }

  const [reviews, total, agg] = await Promise.all([
    prisma.courseReview.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.courseReview.count({ where: { courseId } }),
    prisma.courseReview.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      user: { id: r.user.id, fullName: r.user.fullName },
    })),
    total,
    page,
    limit,
    averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
    totalReviews: agg._count,
  });
}

/** POST: create or update own review (only enrolled users) */
export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { courseId } = await context.params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true },
  });
  if (!course) {
    return NextResponse.json({ message: "Kurs topilmadi." }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId: session.user.id, courseId },
    },
  });
  if (!enrollment) {
    return NextResponse.json({ message: "Faqat kursga yozilgan talabalar baho va izoh qoldira oladi." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Reyting 1–5 orasida bo'lishi va izoh 2000 belgidan oshmasligi kerak." }, { status: 400 });
  }

  const review = await prisma.courseReview.upsert({
    where: {
      userId_courseId: { userId: session.user.id, courseId },
    },
    create: {
      userId: session.user.id,
      courseId,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
    include: {
      user: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    user: { id: review.user.id, fullName: review.user.fullName },
  });
}
