"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Linkedin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type InstructorItem = {
  id: string;
  fullName: string;
  imageUrl: string | null;
  bio: string | null;
  workplace: string | null;
  linkedinUrl: string | null;
};

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
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="flex-shrink-0 pr-2 last:pr-0 sm:pr-4"
              style={{ flex: `0 0 ${cardWidthPercent}%` }}
            >
              <Card className="group h-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg transition duration-300 hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 sm:rounded-2xl">
                {/* O‘lchovli rasm: balandlik o‘rta, chuzilish yo‘q */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-700 sm:h-44 md:h-48">
                  {instructor.imageUrl ? (
                    instructor.imageUrl.startsWith("http") || instructor.imageUrl.startsWith("/uploads/") ? (
                      <img
                        src={instructor.imageUrl}
                        alt={instructor.fullName}
                        className="absolute inset-0 size-full object-cover object-top transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={instructor.imageUrl}
                        alt={instructor.fullName}
                        fill
                        className="object-cover object-top transition duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                      />
                    )
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-4xl font-semibold text-slate-400 dark:text-slate-500">
                      {instructor.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <CardContent className="flex flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                        {instructor.fullName}
                      </h3>
                      {(instructor.workplace || instructor.bio) && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {instructor.workplace ?? instructor.bio ?? ""}
                        </p>
                      )}
                    </div>
                    {instructor.linkedinUrl && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="size-10 flex-shrink-0 rounded-full p-0"
                      >
                        <Link
                          href={instructor.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-[#0A66C2]"
                          aria-label="LinkedIn"
                        >
                          <Linkedin className="size-5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  {instructor.bio && instructor.workplace && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {instructor.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
