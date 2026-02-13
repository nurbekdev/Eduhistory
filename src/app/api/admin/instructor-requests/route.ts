import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: list PENDING instructor requests (admin only) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  const pending = await prisma.instructorRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests: pending });
}
