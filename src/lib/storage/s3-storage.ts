import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { StorageProvider, UploadInput, UploadedFile } from "@/lib/storage/types";

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    });
  }

  async upload(input: UploadInput): Promise<UploadedFile> {
    const folder = input.folder ?? "general";
    const key = `${folder}/${Date.now()}-${input.fileName.replaceAll(" ", "-")}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "") ?? "";
    return {
      fileName: key,
      fileUrl: `${endpoint}/${this.bucket}/${key}`,
      sizeBytes: input.buffer.byteLength,
      mimeType: input.mimeType,
    };
  }

  async remove(_fileUrl: string): Promise<void> {
    void _fileUrl;
    // Minimal skeleton bosqichida remove implementatsiyasi keyingi bosqichga qoldiriladi.
  }
}
