import Link from "next/link";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Medal, Users } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function roleText(role: Role) {
  if (role === Role.ADMIN) return "Admin";
  if (role === Role.INSTRUCTOR) return "Ustoz";
  return "Talaba";
}

export default async function ManagementDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/kirish");
  }
  if (session.user.role === Role.STUDENT) {
    redirect("/dashboard");
  }

  const totalCoursesPromise =
    session.user.role === Role.ADMIN
      ? prisma.course.count()
      : prisma.course.count({
          where: {
            instructorId: session.user.id,
          },
        });

  const publishedCoursesPromise =
    session.user.role === Role.ADMIN
      ? prisma.course.count({
          where: { status: "PUBLISHED" },
        })
      : prisma.course.count({
          where: {
            instructorId: session.user.id,
            status: "PUBLISHED",
          },
        });

  const enrollmentCountPromise =
    session.user.role === Role.ADMIN
      ? prisma.enrollment.count()
      : prisma.enrollment.count({
          where: {
            course: {
              instructorId: session.user.id,
            },
          },
        });

  const certificateCountPromise =
    session.user.role === Role.ADMIN
      ? prisma.certificate.count()
      : prisma.certificate.count({
          where: {
            course: {
              instructorId: session.user.id,
            },
          },
        });

  const [totalCourses, publishedCourses, totalEnrollments, totalCertificates] = await Promise.all([
    totalCoursesPromise,
    publishedCoursesPromise,
    enrollmentCountPromise,
    certificateCountPromise,
  ]);

  return (
    <PageContainer className="space-y-6">
      <SectionTitle
        title="Boshqaruv paneli"
        description="Kurslar, talabalar, testlar va analitikani bir joydan boshqaring."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{session.user.name ?? "Foydalanuvchi"}</CardTitle>
              <Badge variant="locked">{roleText(session.user.role)}</Badge>
            </div>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>Bu sahifa orqali kurslar, darslar, testlar va student statistikalarini boshqarishingiz mumkin.</p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/profil">Mening profilim</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/boshqaruv/kurslar">Kurslarni boshqarish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/boshqaruv/analitika">Analitika</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <BookOpen className="size-4" />
              </div>
              <CardTitle className="text-sm text-slate-500">Kurslar</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">{totalCourses}</CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-4" />
              </div>
              <CardTitle className="text-sm text-slate-500">Published</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">{publishedCourses}</CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Users className="size-4" />
              </div>
              <CardTitle className="text-sm text-slate-500">Students</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">{totalEnrollments}</CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Medal className="size-4" />
              </div>
              <CardTitle className="text-sm text-slate-500">Certificates</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">{totalCertificates}</CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
