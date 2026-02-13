import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  imageUrl: z
    .string()
    .max(2000)
    .refine((v) => v === "" || v.startsWith("/") || v.startsWith("http"), "URL yoki bo'sh qator bo'lishi kerak")
    .optional(),
});

export async function PATCH(request: Request) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().fieldErrors ? "Noto'g'ri maydonlar." : "Noto'g'ri so'rov." },
      { status: 400 }
    );
  }

  const data: { fullName?: string; imageUrl?: string | null } = {};
  if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl === "" ? null : parsed.data.imageUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "Yangilash uchun maydon yuboring." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({
    fullName: user.fullName,
    imageUrl: user.imageUrl,
  });
}
