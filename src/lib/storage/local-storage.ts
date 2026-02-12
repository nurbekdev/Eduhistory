import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { StorageProvider, UploadInput, UploadedFile } from "@/lib/storage/types";

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly baseDir = "public/uploads") {}

  async upload(input: UploadInput): Promise<UploadedFile> {
    const folder = input.folder ?? "general";
    const dir = join(process.cwd(), this.baseDir, folder);
    await mkdir(dir, { recursive: true });

    const safeName = `${Date.now()}-${input.fileName.replaceAll(" ", "-")}`;
    const outputPath = join(dir, safeName);
    await writeFile(outputPath, input.buffer);

    return {
      fileName: safeName,
      fileUrl: `/uploads/${folder}/${safeName}`,
      sizeBytes: input.buffer.byteLength,
      mimeType: input.mimeType,
    };
  }

  async remove(fileUrl: string): Promise<void> {
    const relative = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
    const absolutePath = join(process.cwd(), "public", relative.replace(/^public\//, ""));
    await unlink(absolutePath).catch(() => undefined);
  }
}
