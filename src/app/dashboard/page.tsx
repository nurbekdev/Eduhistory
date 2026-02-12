"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, Medal } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StudentProgressChart = dynamic(
  () =>
    import("@/features/analytics/components/student-progress-chart").then((module) => module.StudentProgressChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-lg bg-zinc-100" />,
  },
);

type MyCourse = {
  id: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  course: {
    title: string;
  };
};

type MyCertificate = {
  id: string;
  uuid: string;
  finalScore: number;
  issuedAt: string;
  course: {
    title: string;
  };
};

async function getMyCourses(): Promise<MyCourse[]> {
  const response = await fetch("/api/me/courses");
  if (!response.ok) throw new Error("Ma'lumotlarni yuklashda xatolik yuz berdi.");
  return response.json();
}

async function getMyCertificates(): Promise<MyCertificate[]> {
  const response = await fetch("/api/me/certificates");
  if (!response.ok) throw new Error("Sertifikatlarni yuklashda xatolik yuz berdi.");
  return response.json();
}

export default function StudentDashboardPage() {
  const session = useSession();
  const query = useQuery({
    queryKey: ["me-courses-dashboard"],
    queryFn: getMyCourses,
  });
  const certificatesQuery = useQuery({
    queryKey: ["me-certificates-dashboard"],
    queryFn: getMyCertificates,
  });

  const stats = useMemo(() => {
    const courses = query.data ?? [];
    const totalCourses = courses.length;
    const totalLessons = courses.reduce((acc, course) => acc + course.totalLessons, 0);
    const completedLessons = courses.reduce((acc, course) => acc + course.completedLessons, 0);
    const avgProgress = totalCourses
      ? Math.round(courses.reduce((acc, course) => acc + course.progressPercent, 0) / totalCourses)
      : 0;

    return {
      totalCourses,
      totalLessons,
      completedLessons,
      avgProgress,
    };
  }, [query.data]);

  return (
    <PageContainer>
      <SectionTitle
        title="Talaba dashboard"
        description="Progress, test natijalari va oxirgi faoliyatingiz bir joyda."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <GraduationCap className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500">Yozilgan kurslar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-slate-900">{stats.totalCourses}</CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <BookOpen className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500">Tugallangan darslar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-slate-900">
            {stats.completedLessons}/{stats.totalLessons}
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500">Completion</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-slate-900">{stats.avgProgress}%</CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Medal className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500">Sertifikatlar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-slate-900">
            {certificatesQuery.isLoading ? "..." : certificatesQuery.data?.length ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mening profilim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>F.I.SH</span>
              <strong>{session.data?.user?.name ?? "Noma'lum"}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Email</span>
              <strong>{session.data?.user?.email ?? "Noma'lum"}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span>Rol</span>
              <Badge variant="locked">Talaba</Badge>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/profil">Profilni ochish</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/mening-kurslarim">Kurslarim</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sertifikatlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {certificatesQuery.isLoading ? (
              <p className="text-slate-500">Sertifikatlar yuklanmoqda...</p>
            ) : certificatesQuery.data && certificatesQuery.data.length > 0 ? (
              certificatesQuery.data.slice(0, 3).map((certificate) => (
                <div key={certificate.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{certificate.course.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(certificate.issuedAt).toLocaleDateString("uz-UZ")} • {certificate.finalScore}%
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/sertifikat/${certificate.uuid}`}>Ko'rish</Link>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-slate-500">Hozircha sertifikat yo'q.</p>
            )}
            <Button asChild className="w-full">
              <Link href="/sertifikatlar">Barcha sertifikatlarni ko'rish</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Baholar dinamikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentProgressChart />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
