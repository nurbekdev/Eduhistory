import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Zap, Linkedin } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityHeatmap } from "@/features/profile/components/activity-heatmap";
import { CopyUsernameButton } from "@/features/profile/components/copy-username-button";
import { ProfileBanner } from "@/features/profile/components/profile-banner";
import { ProfileEdit } from "@/features/profile/components/profile-edit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function usernameFromEmail(email: string): string {
  const part = email.split("@")[0] ?? "";
  return `@${part.replace(/\./g, "-")}`;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      imageUrl: true,
      coins: true,
      createdAt: true,
      instructorProfile: {
        select: { bio: true, workplace: true, linkedinUrl: true },
      },
      _count: {
        select: { enrollments: true, certificates: true, coursesCreated: true, quizAttempts: true },
      },
    },
  });

  if (!user) redirect("/kirish");

  const linkedinDisplay = user.instructorProfile?.linkedinUrl ?? null;

  const [lessonDates, quizDates] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      select: { completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      select: { submittedAt: true },
    }),
  ]);

  const activityByDay: Record<string, number> = {};
  const addDate = (d: Date | null) => {
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    activityByDay[key] = (activityByDay[key] ?? 0) + 1;
  };
  lessonDates.forEach((p) => addDate(p.completedAt));
  quizDates.forEach((a) => addDate(a.submittedAt));

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          instructor: { select: { fullName: true } },
          modules: { include: { lessons: true } },
        },
      },
      progress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  const username = usernameFromEmail(user.email);

  return (
    <PageContainer className="space-y-8">
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
        <ProfileBanner />
        <div className="relative px-4 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end gap-3 sm:-mt-16 sm:gap-4">
            <Avatar
              src={user.imageUrl}
              alt={user.fullName}
              size="xl"
              className="ring-4 ring-white dark:ring-slate-900"
              priority
              quality={95}
            />
            <div className="flex flex-1 flex-wrap items-center gap-3 pb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{user.fullName}</h1>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 dark:border-amber-800 dark:bg-amber-950/50">
                <Zap className="size-4 text-amber-500 dark:text-amber-400" />
                <span className="text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-200">{user.coins}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-slate-600 dark:text-slate-400">{username}</span>
            <CopyUsernameButton username={username} />
            <div className="flex gap-2">
              {linkedinDisplay ? (
                <a
                  href={linkedinDisplay}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 p-2 text-[#0a66c2] hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ActivityHeatmap activityByDay={activityByDay} />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Kurslarim</h2>
        {enrollments.length === 0 ? (
          <Card className="dark:border-slate-700">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-center text-slate-600 dark:text-slate-400">Siz hali hech bir kursga yozilmagansiz.</p>
              <Button asChild>
                <Link href="/kurslar">Kurslar katalogi</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.map((enrollment) => {
              const totalLessons = enrollment.course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
              const completed = enrollment.progress.filter((p) => p.status === "COMPLETED").length;
              const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
              return (
                <Card key={enrollment.id} className="flex flex-col dark:border-slate-700 dark:bg-slate-800/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg dark:text-slate-100">{enrollment.course.title}</CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Muallif: {enrollment.course.instructor.fullName}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Tugatilgan darslar soni: {completed}/{totalLessons}
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/player/${enrollment.course.id}`}>Kursga o&apos;tish</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <ProfileEdit
        imageUrl={user.imageUrl}
        fullName={user.fullName}
        role={user.role}
        instructorProfile={user.instructorProfile}
        githubUrl={null}
        linkedinUrl={linkedinDisplay}
      />
    </PageContainer>
  );
}

