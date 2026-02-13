import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
  newPassword: z.string().min(8, "Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON xato." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors?.newPassword?.[0] ?? parsed.error.flatten().fieldErrors?.currentPassword?.[0] ?? "Noto'g'ri so'rov.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { message: "Parolni faqat email/orqali ro'yxatdan o'tgan hisoblar uchun o'zgartirish mumkin." },
      { status: 400 }
    );
  }

  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!match) {
    return NextResponse.json({ message: "Joriy parol noto'g'ri." }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ message: "Parol yangilandi." });
}
