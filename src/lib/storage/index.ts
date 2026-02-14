import { LocalStorageProvider } from "@/lib/storage/local-storage";
import { S3StorageProvider } from "@/lib/storage/s3-storage";
import type { StorageProvider } from "@/lib/storage/types";

export function getStorageProvider(): StorageProvider {
  if (process.env.STORAGE_DRIVER === "s3") return new S3StorageProvider();
  const baseDir = process.env.LOCAL_UPLOAD_DIR ?? "public/uploads";
  return new LocalStorageProvider(baseDir);
}
