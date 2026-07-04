import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { regenerateCertificateByUuid } from "@/lib/certificate-service";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { uuid } = await context.params;

  try {
    const certificate = await regenerateCertificateByUuid(uuid, session.user.id);
    return NextResponse.json({ message: "Sertifikat yangilandi.", uuid: certificate.uuid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sertifikat yangilashda xatolik.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
