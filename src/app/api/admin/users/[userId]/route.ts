import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Faqat admin." }, { status: 403 });
  }

  const { userId } = await context.params;
  if (userId === session.user.id) {
    return NextResponse.json({ message: "O'zingizni o'chirib bo'lmaydi." }, { status: 400 });
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ message: "Foydalanuvchi o'chirildi." });
}
