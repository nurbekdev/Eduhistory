"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TeacherCard } from "@/components/landing/teacher-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type InstructorItem = {
  id: string;
  fullName: string;
  imageUrl: string | null;
  bio: string | null;
  workplace: string | null;
  linkedinUrl: string | null;
  _count?: { courses?: number };
};

/** Ustozlar kartalari — grid (1/2/3 kolonna). */
export function InstructorsGrid({ instructors }: { instructors: InstructorItem[] }) {
  if (instructors.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Hozircha ustozlar ro'yxati mavjud emas.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {instructors.map((instructor) => (
        <TeacherCard
          key={instructor.id}
          name={instructor.fullName}
          title={instructor.workplace ?? null}
          bio={instructor.bio ?? null}
          avatar={instructor.imageUrl ?? null}
          linkedIn={instructor.linkedinUrl ?? null}
          courseCount={instructor._count?.courses ?? 0}
        />
      ))}
    </div>
  );
}

function useCardsPerPage() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const up = () => {
      const w = window.innerWidth;
      setN(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    up();
    window.addEventListener("resize", up);
    return () => window.removeEventListener("resize", up);
  }, []);
  return n;
}

export function InstructorsCarousel({ instructors }: { instructors: InstructorItem[] }) {
  const count = instructors.length;
  const cardsPerPage = useCardsPerPage();
  const totalPages = Math.max(1, Math.ceil(count / cardsPerPage));
  const [pageIndex, setPageIndex] = useState(0);

  const goNext = () => setPageIndex((i) => (i + 1) % totalPages);
  const goPrev = () => setPageIndex((i) => (i - 1 + totalPages) % totalPages);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(goNext, 6000);
    return () => clearInterval(t);
  }, [totalPages]);

  if (instructors.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Hozircha ustozlar ro'yxati mavjud emas.</p>
      </Card>
    );
  }

  const isMultiPage = count > cardsPerPage;
  const trackWidthPercent = isMultiPage ? totalPages * 100 : 100;
  const cardWidthPercent = 100 / count;
  const translateXPercent = isMultiPage ? -(pageIndex * (100 / totalPages)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} className="size-10 rounded-full p-0 shrink-0">
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} className="size-10 rounded-full p-0 shrink-0">
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pageIndex + 1} / {totalPages}
        </p>
      </div>
      <div className="relative w-full overflow-hidden">
        <div
          className="flex items-start will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            width: `${trackWidthPercent}%`,
            transform: `translate3d(${translateXPercent}%, 0, 0)`,
          }}
        >
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="flex min-w-[260px] shrink-0 pr-3 sm:min-w-[280px] sm:pr-4 md:min-w-[300px]"
              style={{ flex: `0 0 ${cardWidthPercent}%` }}
            >
              <TeacherCard
                name={instructor.fullName}
                title={instructor.workplace ?? undefined}
                bio={instructor.bio}
                avatar={instructor.imageUrl}
                linkedIn={instructor.linkedinUrl}
                courseCount={0}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
