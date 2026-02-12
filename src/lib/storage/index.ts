import { LocalStorageProvider } from "@/lib/storage/local-storage";
import { S3StorageProvider } from "@/lib/storage/s3-storage";
import type { StorageProvider } from "@/lib/storage/types";

export function getStorageProvider(): StorageProvider {
  return process.env.STORAGE_DRIVER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
}
