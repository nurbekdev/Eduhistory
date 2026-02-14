import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const UPLOADS_DIR = "public/uploads";
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
};

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const { path: pathSegments } = await context.params;
  if (!pathSegments?.length) {
    return NextResponse.json({ message: "Path kerak." }, { status: 400 });
  }
  const safeSegments = pathSegments.filter((p) => p !== ".." && p !== "" && !p.includes(".."));
  if (safeSegments.length !== pathSegments.length) {
    return NextResponse.json({ message: "Noto'g'ri path." }, { status: 400 });
  }
  const relativePath = join(UPLOADS_DIR, ...safeSegments);
  const absolutePath = join(process.cwd(), relativePath);
  const allowedRoot = join(process.cwd(), UPLOADS_DIR);
  if (!absolutePath.startsWith(allowedRoot)) {
    return NextResponse.json({ message: "Ruxsat yo'q." }, { status: 403 });
  }
  try {
    const buffer = await readFile(absolutePath);
    const ext = pathSegments[pathSegments.length - 1]?.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
    const contentType = MIME[ext.toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return new NextResponse(null, { status: 404 });
    return NextResponse.json({ message: "Xatolik." }, { status: 500 });
  }
}
