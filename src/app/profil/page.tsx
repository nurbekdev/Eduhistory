import Link from "next/link";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

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

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/kirish");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          certificates: true,
          coursesCreated: true,
          quizAttempts: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/kirish");
  }

  const isManagement = user.role === Role.ADMIN || user.role === Role.INSTRUCTOR;

  const latestCertificates =
    user.role === Role.STUDENT
      ? await prisma.certificate.findMany({
          where: { userId: user.id },
          include: {
            course: {
              select: { title: true },
            },
          },
          orderBy: { issuedAt: "desc" },
          take: 3,
        })
      : [];

  return (
    <PageContainer className="space-y-6">
      <SectionTitle title="Mening profilim" description="Akkaunt ma'lumotlari va shaxsiy faoliyat ko'rsatkichlari." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{user.fullName}</CardTitle>
              <Badge variant="locked">{roleText(user.role)}</Badge>
            </div>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <p>Foydalanuvchi ID: {user.id}</p>
            <p>Ro'yxatdan o'tgan sana: {new Date(user.createdAt).toLocaleDateString("uz-UZ")}</p>
            <p>Quiz urinishlari: {user._count.quizAttempts}</p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            {isManagement ? (
              <>
                <Button asChild>
                  <Link href="/boshqaruv">Boshqaruv paneli</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/boshqaruv/kurslar">Kurslarim</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/mening-kurslarim">Mening kurslarim</Link>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tezkor statistika</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Yozilgan kurslar</span>
              <strong>{user._count.enrollments}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Sertifikatlar</span>
              <strong>{user._count.certificates}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Yaratilgan kurslar</span>
              <strong>{user._count.coursesCreated}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {user.role === Role.STUDENT ? (
        <Card>
          <CardHeader>
            <CardTitle>Sertifikatlarim</CardTitle>
            <CardDescription>So'nggi olingan sertifikatlar ro'yxati.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestCertificates.length === 0 ? (
              <p className="text-zinc-600">Hozircha sertifikat mavjud emas.</p>
            ) : (
              latestCertificates.map((certificate) => (
                <div key={certificate.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{certificate.course.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(certificate.issuedAt).toLocaleDateString("uz-UZ")} • {certificate.finalScore}%
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/sertifikat/${certificate.uuid}`}>Ko'rish</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/sertifikatlar">Barcha sertifikatlarni ochish</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </PageContainer>
  );
}
