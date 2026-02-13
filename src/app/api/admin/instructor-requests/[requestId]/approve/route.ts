import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

/** POST: approve instructor request (admin only) */
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  const { requestId } = await context.params;
  const req = await prisma.instructorRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });

  if (!req || req.status !== "PENDING") {
    return NextResponse.json({ message: "So'rov topilmadi yoki allaqachon qayta ishlangan." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId },
      data: { role: Role.INSTRUCTOR },
    }),
    prisma.instructorRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Ustoz tasdiqlandi." });
}
