import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { UsersListWithDelete } from "@/features/boshqaruv/components/users-list-with-delete";

export default async function FoydalanuvchilarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <PageContainer className="p-6">
      <Badge className="mb-4 w-fit border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
        Admin
      </Badge>
      <SectionTitle
        title="Foydalanuvchilar"
        description="Ustozlar va talabalar ro'yxati. Foydalanuvchini o'chirish — barcha ma'lumotlari (yozilishlar, progress) ham o'chadi."
      />
      <UsersListWithDelete />
    </PageContainer>
  );
}
