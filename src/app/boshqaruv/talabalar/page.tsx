import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { StudentsTable } from "@/features/boshqaruv/components/students-table";

export default async function TalabalarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.INSTRUCTOR)) {
    redirect("/dashboard");
  }

  return (
    <PageContainer className="p-6">
      <Badge className="mb-4 w-fit border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
        Talabalar
      </Badge>
      <SectionTitle
        title="Talabalar ro'yxati"
        description="Kim qayerda to'xtagan, urinishlar soni va natijalar monitoringi."
      />
      <StudentsTable />
    </PageContainer>
  );
}
