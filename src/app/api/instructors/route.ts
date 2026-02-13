import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const instructors = await prisma.user.findMany({
    where: {
      role: Role.INSTRUCTOR,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      imageUrl: true,
      instructorProfile: {
        select: {
          bio: true,
          workplace: true,
          linkedinUrl: true,
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const list = instructors.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    imageUrl: u.imageUrl,
    bio: u.instructorProfile?.bio ?? null,
    workplace: u.instructorProfile?.workplace ?? null,
    linkedinUrl: u.instructorProfile?.linkedinUrl ?? null,
  }));

  return NextResponse.json(list);
}
