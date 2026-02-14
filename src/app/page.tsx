import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BarChart3, BookOpen, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoursesCarousel } from "@/features/marketing/components/courses-carousel";
import { InstructorsCarousel } from "@/features/marketing/components/instructors-carousel";
import { Reveal } from "@/features/marketing/components/reveal";
import { TiltCard } from "@/features/marketing/components/tilt-card";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";
import { CourseLevel, CourseStatus, Role } from "@prisma/client";

const features = [
  {
    icon: BookOpen,
    title: "Kurs Builder Pro",
    text: "Modul, dars va testlarni bir sahifada professional boshqaruv.",
  },
  {
    icon: Lock,
    title: "Progress gating",
    text: "Testdan o'tmasdan keyingi darslar ochilmaydi.",
  },
  {
    icon: BarChart3,
    title: "Analitika va statistika",
    text: "Kurslar bo'yicha completion, drop-off va test natijalari.",
  },
  {
    icon: ShieldCheck,
    title: "Xavfsizlik va RBAC",
    text: "Admin, ustoz va talaba uchun qat'iy role-based ruxsatlar.",
  },
];

function getStats(t: (k: string) => string) {
  return [
    { value: "120+", label: t("home.stats.courses") },
    { value: "5000+", label: t("home.stats.students") },
    { value: "98%", label: t("home.stats.completion") },
    { value: "25+", label: t("home.stats.instructors") },
  ];
}

const levelLabels: Record<CourseLevel, string> = {
  BEGINNER: "Boshlang'ich",
  INTERMEDIATE: "O'rta",
  ADVANCED: "Yuqori",
};

function getCoursePreviewImage(category: string, coverImageUrl?: string | null) {
  if (coverImageUrl?.startsWith("http") || coverImageUrl?.startsWith("/")) return coverImageUrl;
  const lower = category.toLowerCase();
  if (lower.includes("robot")) return "/images/robotics.jpg";
  if (lower.includes("it")) return "/images/it.jpg";
  if (lower.includes("3d")) return "/images/3d.jpg";
  return "/images/it.jpg";
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";
  const t = getT(locale);

  const publishedCourses = await prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED },
    include: {
      modules: {
        include: {
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 12,
  });

  const coursesForCarousel = publishedCourses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    level: levelLabels[c.level],
    durationMinutes: c.durationMinutes,
    modulesCount: c.modules.length,
    lessonsCount: c.modules.reduce((acc, m) => acc + m._count.lessons, 0),
    image: getCoursePreviewImage(c.category, c.coverImageUrl),
  }));

  const instructors = await prisma.user.findMany({
    where: { role: Role.INSTRUCTOR, isActive: true },
    select: {
      id: true,
      fullName: true,
      imageUrl: true,
      instructorProfile: {
        select: { bio: true, workplace: true, linkedinUrl: true },
      },
    },
    orderBy: { fullName: "asc" },
  });
  const instructorsForCarousel = instructors.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    imageUrl: u.imageUrl,
    bio: u.instructorProfile?.bio ?? null,
    workplace: u.instructorProfile?.workplace ?? null,
    linkedinUrl: u.instructorProfile?.linkedinUrl ?? null,
  }));

  return (
    <PageContainer className="min-w-0 space-y-10 pb-12 sm:space-y-14 sm:pb-16">
      <Reveal>
        <section className="relative overflow-hidden rounded-xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-white via-emerald-50 to-teal-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 px-4 py-8 shadow-xl sm:rounded-2xl sm:px-10 sm:py-14">
          <div className="animate-float-slow absolute -left-16 top-10 size-48 rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 blur-3xl" />
          <div className="animate-float-medium absolute -right-10 -top-10 size-56 rounded-full bg-teal-200/50 dark:bg-teal-900/30 blur-3xl" />
          <div className="animate-float-fast absolute bottom-4 right-1/3 size-24 rounded-full bg-emerald-300/40 dark:bg-emerald-800/40 blur-2xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="min-w-0 space-y-5 sm:space-y-6">
              <Badge className="gap-1 border border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-3.5" />
                {t("home.hero.badge")}
              </Badge>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl md:text-5xl">
                {t("home.hero.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base sm:leading-7 sm:text-lg">
                {t("home.hero.subtitle")} Ro&apos;yxatdan o&apos;ting — bepul. Bugun kurslarga yozilib o&apos;qishni boshlang.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button
                  asChild
                  className="group h-11 w-full bg-gradient-to-r from-emerald-600 to-teal-500 px-5 text-sm text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl sm:h-12 sm:w-auto sm:px-6 sm:text-base"
                >
                  <Link href="/royxatdan-otish" className="inline-flex items-center justify-center font-semibold">
                    Bepul ro&apos;yxatdan o&apos;tish
                    <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="group h-11 w-full border-emerald-200 dark:border-emerald-700 bg-white/80 dark:bg-slate-800/80 text-sm text-emerald-700 dark:text-emerald-300 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 dark:hover:bg-emerald-900/30 sm:h-12 sm:w-auto sm:text-base"
                >
                  <Link href="/kurslar" className="inline-flex items-center justify-center">
                    {t("home.hero.courses")}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-11 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 sm:h-12"
                >
                  <Link href="/kirish">Akkauntingiz bormi? Kirish</Link>
                </Button>
              </div>
            </div>

            <div className="relative min-w-0">
              <Card className="rounded-xl border border-white/60 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 shadow-xl backdrop-blur sm:rounded-2xl">
                <CardHeader className="space-y-1 p-4 sm:p-6">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100 sm:text-lg">Eduhistory boshqaruv paneli</CardTitle>
                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">Kurslar, progress va analitika real vaqtga yaqin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Faol kurslar</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">32</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Pass rate</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">89%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-2 w-1/2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl sm:grid-cols-2 sm:gap-3 sm:rounded-2xl sm:p-6 lg:grid-cols-4">
          {getStats(t).map((item, idx) => (
            <Reveal key={item.label} delayMs={idx * 80}>
              <div className="rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-3 text-center transition duration-300 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 sm:rounded-xl sm:p-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{item.value}</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">{item.label}</p>
              </div>
            </Reveal>
          ))}
        </section>
      </Reveal>

      <section className="min-w-0 space-y-4 sm:space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{t("home.features.title")}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 60}>
              <TiltCard>
                <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{feature.title}</CardTitle>
                    <CardDescription className="leading-6 text-slate-600 dark:text-slate-400">{feature.text}</CardDescription>
                  </CardHeader>
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="min-w-0 space-y-4 sm:space-y-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Kurslar</h2>
          {coursesForCarousel.length > 0 && (
            <Badge className="border border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Yangi kurslar
            </Badge>
          )}
          </div>
        </Reveal>
        <Reveal delayMs={100}>
          <CoursesCarousel courses={coursesForCarousel} />
        </Reveal>
      </section>

      <section className="min-w-0 space-y-4 sm:space-y-5">
        <Reveal>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Bizning ustozlar
            </h2>
          </div>
        </Reveal>
        <Reveal delayMs={100}>
          <InstructorsCarousel instructors={instructorsForCarousel} />
        </Reveal>
      </section>

      <Reveal>
        <section className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-gradient-to-r from-emerald-600 to-teal-500 p-4 shadow-xl sm:rounded-2xl sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-2">
              <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                Eduhistory bilan o&apos;qishni bugun boshlang
              </h2>
              <p className="max-w-xl text-sm text-emerald-50 sm:text-base md:text-lg">
                Ro&apos;yxatdan o&apos;ting, kurslarga yoziling va sertifikat oling. Bepul hisob ochish bir necha soniya.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button
                asChild
                className="h-11 w-full bg-white px-6 text-sm font-semibold text-emerald-700 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 sm:h-12 sm:w-auto sm:px-8 sm:text-base"
              >
                <Link href="/royxatdan-otish">Bepul ro&apos;yxatdan o&apos;tish</Link>
              </Button>
              <Link
                href="/kirish"
                className="text-center text-sm font-medium text-white/90 underline-offset-2 hover:underline"
              >
                Akkauntingiz bormi? Kirish
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </PageContainer>
  );
}
