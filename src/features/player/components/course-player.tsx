"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toYoutubeEmbedUrl } from "@/lib/youtube";

type Option = {
  id: string;
  text: string;
};

type Question = {
  id: string;
  text: string;
  explanation: string | null;
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT";
  options: Option[];
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  attemptLimit: number;
  questions: Question[];
};

type Lesson = {
  id: string;
  title: string;
  description: string;
  content: string | null;
  youtubeUrl: string;
  videoFileUrl: string | null;
  durationMinutes: number;
  order: number;
  materials: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
  }>;
  progress: {
    status: "LOCKED" | "UNLOCKED" | "COMPLETED";
    attemptsUsed: number;
    lastAttemptScore: number | null;
  };
  quiz: Quiz | null;
};

type Module = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type PlayerPayload = {
  enrollment: {
    id: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
  };
  course: {
    id: string;
    title: string;
    description: string;
    modules: Module[];
    finalQuiz: (Quiz & { canStart: boolean; attemptsUsed: number }) | null;
    certificate: {
      id: string;
      uuid: string;
      pdfUrl: string | null;
      finalScore: number;
      issuedAt: string;
    } | null;
  };
};

async function fetchCoursePlayer(courseId: string): Promise<PlayerPayload> {
  const response = await fetch(`/api/player/course/${courseId}`);
  if (!response.ok) throw new Error("Kurs player ma'lumotini olishda xatolik yuz berdi.");
  return response.json();
}

export function CoursePlayer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["course-player", courseId],
    queryFn: () => fetchCoursePlayer(courseId),
  });

  const allLessons = useMemo(() => query.data?.course.modules.flatMap((moduleItem) => moduleItem.lessons) ?? [], [query.data]);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const computedActiveLessonId =
    activeLessonId ??
    allLessons.find((lesson) => lesson.progress.status === "UNLOCKED")?.id ??
    allLessons.find((lesson) => lesson.progress.status === "COMPLETED")?.id ??
    allLessons[0]?.id ??
    null;

  const activeLesson = allLessons.find((lesson) => lesson.id === computedActiveLessonId) ?? null;
  const finalQuiz = query.data?.course.finalQuiz ?? null;
  const certificate = query.data?.course.certificate ?? null;

  const onStartAttempt = async (quizId: string) => {
    if (!query.data) return null;
    const response = await fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId,
        enrollmentId: query.data.enrollment.id,
      }),
    });

    const body = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      toast.error(body.message ?? "Testni boshlashda xatolik yuz berdi.");
      return null;
    }
    toast.success("Test boshlandi.");
    return body.id ?? null;
  };

  const onStartQuiz = async () => {
    if (!activeLesson?.quiz) return;
    const createdId = await onStartAttempt(activeLesson.quiz.id);
    if (!createdId) return;
    router.push(`/quiz/${createdId}`);
  };

  const onStartFinalQuiz = async () => {
    if (!finalQuiz) return;
    const createdId = await onStartAttempt(finalQuiz.id);
    if (!createdId) return;
    router.push(`/quiz/${createdId}`);
  };

  if (query.isLoading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-zinc-600">Kurs player yuklanmoqda...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-red-600">Kurs playerni yuklashda xatolik yuz berdi.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Darslar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {query.data.course.modules.map((moduleItem) => (
            <div key={moduleItem.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {moduleItem.order}-modul: {moduleItem.title}
              </p>
              {moduleItem.lessons.map((lesson) => {
                const isLocked = lesson.progress.status === "LOCKED";
                const isActive = lesson.id === computedActiveLessonId;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      setActiveLessonId(lesson.id);
                    }}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      isActive ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                    } ${isLocked ? "cursor-not-allowed bg-zinc-100 text-zinc-500" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{lesson.title}</span>
                      {isLocked ? (
                        <Badge variant="locked" className="gap-1">
                          <Lock className="size-3" />
                          Qulf
                        </Badge>
                      ) : lesson.progress.status === "COMPLETED" ? (
                        <Badge>Yakunlangan</Badge>
                      ) : (
                        <Badge variant="warning">Faol</Badge>
                      )}
                    </div>
                    {isLocked ? <p className="mt-1 text-xs">Avval testdan o'ting</p> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {activeLesson ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{activeLesson.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video overflow-hidden rounded-lg border">
                <iframe
                  src={toYoutubeEmbedUrl(activeLesson.youtubeUrl)}
                  title={activeLesson.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-zinc-700">{activeLesson.description}</p>
              {activeLesson.content ? <p className="text-sm text-zinc-600">{activeLesson.content}</p> : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Materiallar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {activeLesson.materials.length === 0 ? (
                  <p className="text-zinc-600">Qo'shimcha materiallar yo'q.</p>
                ) : (
                  activeLesson.materials.map((material) => (
                    <a
                      key={material.id}
                      href={material.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md border p-2 hover:bg-zinc-50"
                    >
                      {material.fileName}
                    </a>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!activeLesson.quiz ? (
                  <p className="text-sm text-zinc-600">Bu dars uchun test mavjud emas.</p>
                ) : (
                  <>
                    <div className="text-sm text-zinc-700">
                      <p>
                        Passing score: <strong>{activeLesson.quiz.passingScore}%</strong>
                      </p>
                      <p>
                        Urinishlar:{" "}
                        <strong>
                          {activeLesson.progress.attemptsUsed}/{activeLesson.quiz.attemptLimit}
                        </strong>
                      </p>
                    </div>

                    {activeLesson.progress.status === "COMPLETED" ? (
                      <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-700">
                        Siz bu dars testidan o'tgansiz.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button onClick={onStartQuiz}>Testni boshlash</Button>
                        <p className="text-xs text-zinc-500">
                          Test yangi attempt-runner sahifasida ochiladi (timer, autosave va anti-leave himoyasi bilan).
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kurs yakuniy testi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!finalQuiz ? (
                <p className="text-sm text-zinc-600">Bu kurs uchun yakuniy test hali sozlanmagan.</p>
              ) : certificate ? (
                <div className="space-y-3 rounded-lg border bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">Yakuniy test muvaffaqiyatli topshirilgan.</p>
                  <p className="text-sm text-zinc-700">Final score: {certificate.finalScore}%</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={certificate.pdfUrl ?? "#"} target="_blank" rel="noreferrer">
                        Sertifikatni yuklab olish
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/sertifikat/${certificate.uuid}`}>Verify sahifasi</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/sertifikatlar">Barcha sertifikatlar</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-zinc-700">
                    <p>
                      Passing score: <strong>{finalQuiz.passingScore}%</strong>
                    </p>
                    <p>
                      Urinishlar:{" "}
                      <strong>
                        {finalQuiz.attemptsUsed}/{finalQuiz.attemptLimit}
                      </strong>
                    </p>
                  </div>

                  {!finalQuiz.canStart ? (
                    <div className="rounded-md border bg-zinc-100 p-3 text-sm text-zinc-600">
                      Yakuniy test ochilishi uchun barcha dars testlaridan o'tishingiz kerak.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button onClick={onStartFinalQuiz}>Yakuniy testni boshlash</Button>
                      <p className="text-xs text-zinc-500">
                        Yakuniy test ham alohida attempt-runner sahifasida bajariladi.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-600">Dars tanlang.</CardContent>
        </Card>
      )}
    </div>
  );
}
