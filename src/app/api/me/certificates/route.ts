import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const certificates = await prisma.certificate.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      course: {
        select: { id: true, title: true, category: true },
      },
    },
    orderBy: {
      issuedAt: "desc",
    },
  });

  return NextResponse.json(certificates);
}
