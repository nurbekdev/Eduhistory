import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { NotificationTarget, Role } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  targetRole: z.enum(["STUDENT", "INSTRUCTOR", "ALL"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Kirish kerak." }, { status: 401 });
  }

  const role = (session.user.role as Role) ?? Role.STUDENT;
  const targetRoleFilter =
    role === Role.ADMIN
      ? undefined
      : role === Role.INSTRUCTOR
        ? [{ targetRole: NotificationTarget.INSTRUCTOR }, { targetRole: NotificationTarget.ALL }]
        : [{ targetRole: NotificationTarget.STUDENT }, { targetRole: NotificationTarget.ALL }];

  const notifications = await prisma.notification.findMany({
    where:
      role === Role.ADMIN
        ? {}
        : { OR: targetRoleFilter },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      createdBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON xato." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Noto'g'ri maydonlar." }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      targetRole: parsed.data.targetRole as NotificationTarget,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
