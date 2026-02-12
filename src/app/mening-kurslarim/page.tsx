import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MyCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      course: {
        include: {
          instructor: {
            select: { fullName: true },
          },
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
      progress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <PageContainer className="space-y-6">
      <SectionTitle title="Mening kurslarim" description="Yozilgan kurslar va progress holatlari." />
      <div className="grid gap-4 md:grid-cols-2">
        {enrollments.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="p-6 text-sm text-zinc-600">Siz hali hech bir kursga yozilmagansiz.</CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => {
            const totalLessons = enrollment.course.modules.reduce((acc, moduleItem) => acc + moduleItem.lessons.length, 0);
            const completed = enrollment.progress.filter((item) => item.status === "COMPLETED").length;
            const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
            return (
              <Card key={enrollment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{enrollment.course.title}</CardTitle>
                    <Badge>{percent}%</Badge>
                  </div>
                  <CardDescription>{enrollment.course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-zinc-600">
                  <p>Ustoz: {enrollment.course.instructor.fullName}</p>
                  <p>
                    Progress: {completed}/{totalLessons} dars
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/player/${enrollment.course.id}`}>Davom ettirish</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
