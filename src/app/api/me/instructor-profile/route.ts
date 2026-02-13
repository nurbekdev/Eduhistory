import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  bio: z.string().max(2000).optional(),
  workplace: z.string().max(300).optional(),
  linkedinUrl: z.string().url().max(500).or(z.literal("")).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const profile = await prisma.instructorProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile ?? { bio: null, workplace: null, linkedinUrl: null });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== Role.INSTRUCTOR && user?.role !== Role.ADMIN) {
    return NextResponse.json(
      { message: "Faqat ustoz yoki admin uchun ustoz profili mavjud." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON xato." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().fieldErrors ? "Noto'g'ri maydonlar." : "Noto'g'ri so'rov." },
      { status: 400 }
    );
  }

  const data: { bio?: string | null; workplace?: string | null; linkedinUrl?: string | null } = {};
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio || null;
  if (parsed.data.workplace !== undefined) data.workplace = parsed.data.workplace || null;
  if (parsed.data.linkedinUrl !== undefined) data.linkedinUrl = parsed.data.linkedinUrl === "" ? null : parsed.data.linkedinUrl;

  const profile = await prisma.instructorProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
    },
    update: data,
  });

  return NextResponse.json(profile);
}
