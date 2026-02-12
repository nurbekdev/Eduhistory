import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookCheck,
  BarChart3,
  BookOpen,
  Clock3,
  Layers3,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/features/marketing/components/reveal";
import { TiltCard } from "@/features/marketing/components/tilt-card";

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

const stats = [
  {
    value: "120+",
    label: "Kurs",
  },
  {
    value: "5000+",
    label: "Talabalar",
  },
  {
    value: "98%",
    label: "Completion",
  },
  {
    value: "25+",
    label: "Instructor",
  },
];

const demoCourses = [
  {
    title: "Robototexnika asoslari",
    lessons: "18 dars",
    duration: "12 soat",
    level: "Boshlang'ich",
    image: "/images/robotics.jpg",
  },
  {
    title: "IT Foundation",
    lessons: "24 dars",
    duration: "16 soat",
    level: "O'rta",
    image: "/images/it.jpg",
  },
  {
    title: "3D Modellashtirish",
    lessons: "20 dars",
    duration: "14 soat",
    level: "Boshlang'ich",
    image: "/images/3d.jpg",
  },
];

export default function LandingPage() {
  return (
    <PageContainer className="space-y-14 pb-16">
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 px-6 py-10 shadow-xl sm:px-10 sm:py-14">
          <div className="animate-float-slow absolute -left-16 top-10 size-48 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="animate-float-medium absolute -right-10 -top-10 size-56 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="animate-float-fast absolute bottom-4 right-1/3 size-24 rounded-full bg-emerald-300/40 blur-2xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge className="gap-1 border border-emerald-200 bg-emerald-100 text-emerald-700">
                <Sparkles className="size-3.5" />
                Premium LMS tajribasi
              </Badge>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Zamonaviy kurslar uchun professional LMS
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Eduhistory maktab fanlari, IT, robototexnika va 3D modellashtirish kurslari uchun zamonaviy o'quv
                platformasi.
              </p>
              <div className="grid gap-3 sm:flex">
                <Button
                  asChild
                  className="group h-11 w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl sm:w-auto"
                >
                  <Link href="/kurslar" className="inline-flex items-center justify-center">
                    Kurslarni ko'rish
                    <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="group h-11 w-full border-emerald-200 bg-white/80 text-emerald-700 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 sm:w-auto"
                >
                  <Link href="/boshqaruv/analitika" className="inline-flex items-center justify-center">
                    Demo dashboard
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <Card className="animate-float-slow rounded-2xl border border-white/60 bg-white/90 shadow-xl backdrop-blur">
                <CardHeader className="space-y-1">
                  <Image
                    src="/images/dashboard-preview.jpg"
                    alt="Eduhistory dashboard preview"
                    width={1200}
                    height={800}
                    className="h-auto w-full rounded-xl object-cover shadow-sm"
                    priority
                  />
                  <CardTitle className="text-lg text-slate-900">Eduhistory boshqaruv paneli</CardTitle>
                  <CardDescription className="text-slate-600">Kurslar, progress va analitika real vaqtga yaqin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-slate-600">Faol kurslar</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">32</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-slate-600">Pass rate</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">89%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
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
        <section className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-3xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-slate-600">{item.label}</p>
            </div>
          ))}
        </section>
      </Reveal>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Platforma imkoniyatlari</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 60}>
              <TiltCard>
                <Card className="rounded-2xl border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">{feature.title}</CardTitle>
                    <CardDescription className="leading-6 text-slate-600">{feature.text}</CardDescription>
                  </CardHeader>
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Demo kurs preview</h2>
          <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">Yangi kurslar</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {demoCourses.map((course, index) => (
            <Reveal key={course.title} delayMs={index * 70}>
              <Card className="group rounded-2xl border border-slate-200 bg-white shadow-md transition duration-300 hover:scale-[1.01] hover:shadow-xl">
                <CardContent className="space-y-4 p-5">
                  <div className="overflow-hidden rounded-xl">
                    <Image
                      src={course.image}
                      alt={`${course.title} kurs preview rasmi`}
                      width={640}
                      height={420}
                      className="h-40 w-full object-cover shadow-sm transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                        <Layers3 className="size-3.5" />
                        {course.lessons}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                        <Clock3 className="size-3.5" />
                        {course.duration}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        <BookCheck className="size-3.5" />
                        {course.level}
                      </span>
                    </div>
                  </div>
                  <Button asChild className="w-full bg-emerald-600 transition duration-200 group-hover:bg-emerald-700">
                    <Link href="/kurslar">Kursga yozilish</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-500 p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold text-white">Eduhistory bilan o'qishni keyingi bosqichga olib chiqing</h2>
              <p className="text-emerald-50">
                Kurslar, testlar, analitika va sertifikatlarni bitta premium platformada boshqaring.
              </p>
            </div>
            <Button
              asChild
              className="h-11 w-full bg-white text-emerald-700 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 sm:w-auto"
            >
              <Link href="/royxatdan-otish">Bepul boshlash</Link>
            </Button>
          </div>
        </section>
      </Reveal>
    </PageContainer>
  );
}
