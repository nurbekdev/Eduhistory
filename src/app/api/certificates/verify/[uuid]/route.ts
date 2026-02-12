import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { uuid } = await context.params;
  const certificate = await prisma.certificate.findUnique({
    where: { uuid },
    include: {
      user: {
        select: { fullName: true },
      },
      course: {
        select: { title: true },
      },
    },
  });

  if (!certificate) {
    return NextResponse.json({ valid: false, message: "Sertifikat topilmadi." }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    message: "Sertifikat haqiqiy.",
    data: {
      student: certificate.user.fullName,
      course: certificate.course.title,
      finalScore: certificate.finalScore,
      completionPercent: certificate.completionPercent,
      issuedAt: certificate.issuedAt,
    },
  });
}
