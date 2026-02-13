-- CreateTable
CREATE TABLE "CertificateSettings" (
    "id" TEXT NOT NULL,
    "templateType" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "verifyUrlFormat" TEXT,
    "qrTextField" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateSettings_pkey" PRIMARY KEY ("id")
);
