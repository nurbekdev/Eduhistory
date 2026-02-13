"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BookCheck, ChevronLeft, ChevronRight, Clock3, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CourseItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: string;
  durationMinutes: number;
  modulesCount: number;
  lessonsCount: number;
  image: string;
};

function getCourseImage(category: string, coverImageUrl?: string | null) {
  if (coverImageUrl?.startsWith("http") || coverImageUrl?.startsWith("/")) return coverImageUrl;
  const lower = category.toLowerCase();
  if (lower.includes("robot")) return "/images/robotics.jpg";
  if (lower.includes("it")) return "/images/it.jpg";
  if (lower.includes("3d")) return "/images/3d.jpg";
  return "/images/it.jpg";
}

const CARDS_PER_PAGE = 3;

export function CoursesCarousel({ courses }: { courses: CourseItem[] }) {
  const totalPages = Math.max(1, Math.ceil(courses.length / CARDS_PER_PAGE));
  const [pageIndex, setPageIndex] = useState(0);

  const goNext = () => setPageIndex((i) => (i + 1) % totalPages);
  const goPrev = () => setPageIndex((i) => (i - 1 + totalPages) % totalPages);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(goNext, 5000);
    return () => clearInterval(t);
  }, [totalPages]);

  if (courses.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Hozircha nashr qilingan kurslar yo'q.</p>
        <Button asChild className="mt-4">
          <Link href="/kurslar">Kurslar katalogi</Link>
        </Button>
      </Card>
    );
  }

  const isMultiPage = courses.length > CARDS_PER_PAGE;
  const trackWidthPercent = isMultiPage ? totalPages * 100 : 100;
  const cardWidthPercent = 100 / courses.length;
  const translateXPercent = isMultiPage ? -(pageIndex * (100 / totalPages)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} className="size-10 rounded-full p-0">
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} className="size-10 rounded-full p-0">
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pageIndex + 1} / {totalPages}
        </p>
      </div>
      <div className="relative w-full overflow-hidden">
        <div
          className="flex will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            width: `${trackWidthPercent}%`,
            transform: `translate3d(${translateXPercent}%, 0, 0)`,
          }}
        >
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex-shrink-0 pr-4 last:pr-0"
              style={{ flex: `0 0 ${cardWidthPercent}%` }}
            >
              <Card className="group h-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md transition duration-300 hover:scale-[1.01] hover:shadow-xl">
                <CardContent className="space-y-4 p-5">
                  <div className="overflow-hidden rounded-xl">
                    {course.image.startsWith("http") ? (
                      <img
                        src={course.image}
                        alt=""
                        className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <Image
                        src={course.image}
                        alt=""
                        width={640}
                        height={280}
                        className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1">
                        <Layers3 className="size-3.5" />
                        {course.lessonsCount} dars
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1">
                        <Clock3 className="size-3.5" />
                        {Math.round(course.durationMinutes / 60)} soat
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                        <BookCheck className="size-3.5" />
                        {course.level}
                      </span>
                    </div>
                  </div>
                  <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Link href={`/kurslar/${course.slug}`}>Kursga yozilish</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
