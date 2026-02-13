-- CreateEnum
CREATE TYPE "InstructorRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "InstructorRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InstructorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "InstructorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstructorRequest_userId_key" ON "InstructorRequest"("userId");

-- CreateIndex
CREATE INDEX "InstructorRequest_status_idx" ON "InstructorRequest"("status");

-- AddForeignKey
ALTER TABLE "InstructorRequest" ADD CONSTRAINT "InstructorRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
