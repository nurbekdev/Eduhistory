import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStorageProvider } from "@/lib/storage";
import { validateUpload } from "@/lib/upload";

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 50);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`upload:${ip}`, 60, 60_000);
  if (!rate.success) {
    return NextResponse.json({ message: "Upload limitdan oshdingiz. Birozdan keyin urinib ko'ring." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: `Fayl hajmi ${MAX_UPLOAD_MB}MB dan oshmasligi kerak. So‘rov tanalmadi.` },
      { status: 413 }
    );
  }

  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "general");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Fayl topilmadi." }, { status: 400 });
  }

  const validation = validateUpload({ type: file.type, size: file.size });
  if (!validation.ok) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ message: "Faylni o‘qib bo‘lmadi." }, { status: 400 });
  }

  const storage = getStorageProvider();
  const uploaded = await storage.upload({
    fileName: file.name,
    mimeType: file.type,
    buffer,
    folder,
  });

  return NextResponse.json(uploaded, { status: 201 });
}
