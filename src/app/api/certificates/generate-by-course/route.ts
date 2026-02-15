import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { generateCertificateForCourseCompletion } from "@/lib/certificate-service";

const bodySchema = z.object({
  courseId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Kurs ID kiritilishi kerak." }, { status: 400 });
  }

  try {
    const certificate = await generateCertificateForCourseCompletion({
      userId: session.user.id,
      courseId: parsed.data.courseId,
      generatedBy: "api/certificates/generate-by-course",
    });
    return NextResponse.json({
      message: "Sertifikat yaratildi.",
      certificate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sertifikat yaratishda xatolik.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
