import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

/** Sertifikat PDF faylini egasi uchun qaytaradi (serverless muhitda public fayl bo‘lmasa ham). */
export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uuid } = await context.params;
  const certificate = await prisma.certificate.findUnique({
    where: { uuid },
    select: { userId: true, pdfContent: true },
  });

  if (!certificate || certificate.userId !== session.user.id) {
    return NextResponse.json({ error: "Sertifikat topilmadi" }, { status: 404 });
  }

  if (!certificate.pdfContent || certificate.pdfContent.length === 0) {
    return NextResponse.json(
      { error: "PDF hali saqlanmagan (eski sertifikat). Qayta yuklash yoki boshqaruv orqali qayta generatsiya qiling." },
      { status: 404 }
    );
  }

  const raw = certificate.pdfContent;
  const buffer =
    Buffer.isBuffer(raw) ? raw : Buffer.from(raw as unknown as Uint8Array);

  const url = new URL(request.url);
  const isDownload = url.searchParams.get("download") === "1";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": isDownload ? "attachment; filename=certificate.pdf" : "inline; filename=certificate.pdf",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
