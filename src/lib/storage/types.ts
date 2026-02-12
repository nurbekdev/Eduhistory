export type UploadInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folder?: string;
};

export type UploadedFile = {
  fileUrl: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
};

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadedFile>;
  remove(fileUrl: string): Promise<void>;
}
