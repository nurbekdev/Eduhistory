import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Faqat admin." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role"); // STUDENT | INSTRUCTOR | ADMIN

  const where =
    role === "STUDENT"
      ? { role: Role.STUDENT }
      : role === "INSTRUCTOR"
        ? { role: Role.INSTRUCTOR }
        : role === "ADMIN"
          ? { role: Role.ADMIN }
          : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      imageUrl: true,
      _count: {
        select: { enrollments: true, coursesCreated: true },
      },
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      imageUrl: u.imageUrl ?? null,
      enrollmentsCount: u._count.enrollments,
      coursesCreatedCount: u._count.coursesCreated,
    }))
  );
}
