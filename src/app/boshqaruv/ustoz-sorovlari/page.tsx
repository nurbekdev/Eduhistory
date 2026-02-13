import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { InstructorRequestsTable } from "@/features/admin/components/instructor-requests-table";

export default async function UstozSorovlariPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  const pending = await prisma.instructorRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageContainer className="p-6">
      <SectionTitle
        title="Ustoz bo'lish so'rovlari"
        description="Ro'yxatdan o'tishda «Ustoz bo'lish» belgilagan foydalanuvchilar. Tasdiqlang yoki rad eting."
      />
      <InstructorRequestsTable initialRequests={pending} />
    </PageContainer>
  );
}
