import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const registerSchema = z
  .object({
    fullName: z.string().min(3, "F.I.SH kamida 3 ta belgidan iborat bo'lishi kerak"),
    email: z.string().email("Email noto'g'ri kiritilgan"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Parollar bir xil emas",
  });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`register:${ip}`, 20, 60_000);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring." },
      { status: 429 },
    );
  }

  const payload = await request.json();
  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Kiritilgan ma'lumotlar noto'g'ri." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return NextResponse.json({ message: "Bu email allaqachon ro'yxatdan o'tgan." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      passwordHash,
      role: Role.STUDENT,
    },
  });

  return NextResponse.json({ message: "Hisob muvaffaqiyatli yaratildi." }, { status: 201 });
}
