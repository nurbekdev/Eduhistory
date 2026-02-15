"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, FileText, Lock } from "lucide-react";
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
  let body: PlayerPayload | { message?: string; error?: string };
  try {
    body = (await response.json()) as PlayerPayload | { message?: string; error?: string };
  } catch {
    throw new Error("Kurs player ma'lumotini olishda xatolik yuz berdi.");
  }
  if (!response.ok) {
    const msg = body && "error" in body && body.error ? body.error : body && "message" in body ? body.message : "Kurs player ma'lumotini olishda xatolik yuz berdi.";
    throw new Error(msg);
  }
  return body as PlayerPayload;
}

export function CoursePlayer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["course-player", courseId],
    queryFn: () => fetchCoursePlayer(courseId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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

  const nextLesson = useMemo(() => {
    if (!activeLesson) return null;
    const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
    return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] ?? null : null;
  }, [activeLesson, allLessons]);

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

  const [generatingCert, setGeneratingCert] = useState(false);
  const onRequestCertificate = async () => {
    if (!query.data?.course.id) return;
    setGeneratingCert(true);
    try {
      const res = await fetch("/api/certificates/generate-by-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: query.data.course.id }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Sertifikat olishda xatolik.");
        return;
      }
      toast.success("Sertifikat yaratildi.");
      await query.refetch();
    } finally {
      setGeneratingCert(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="rounded-lg border p-6 text-sm" style={{ borderColor: "var(--border-default)", background: "var(--bg-card)", color: "var(--text-muted)" }}>
        Kurs player yuklanmoqda...
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-lg border p-6 text-sm text-red-600" style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}>
        <p className="font-medium">Kurs playerni yuklashda xatolik yuz berdi.</p>
        {query.error?.message && <p className="mt-2 break-words text-xs opacity-90">{query.error.message}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
        <CardHeader>
          <CardTitle style={{ color: "var(--text-primary)" }}>Darslar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {query.data.course.modules.map((moduleItem) => (
            <div key={moduleItem.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
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
                      isActive
                        ? "border-[var(--clr-gold)] bg-[var(--clr-dust)] text-[var(--text-primary)]"
                        : "border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--clr-dust)] text-[var(--text-primary)]"
                    } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                    style={isLocked ? { color: "var(--text-muted)" } : undefined}
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
        <div className="space-y-6">
          <Card className="overflow-hidden border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
            <CardHeader className="space-y-1 border-b pb-4" style={{ borderColor: "var(--border-default)", background: "var(--clr-dust)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl" style={{ color: "var(--text-primary)" }}>{activeLesson.title}</CardTitle>
                {activeLesson.durationMinutes > 0 && (
                  <Badge variant="outline" className="gap-1 font-normal" style={{ borderColor: "var(--clr-bronze)", color: "var(--clr-bronze)" }}>
                    <Clock3 className="size-3.5" />
                    {activeLesson.durationMinutes} daq
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {activeLesson.youtubeUrl?.trim() ? (
                <div className="aspect-video overflow-hidden rounded-xl border bg-black shadow-sm" style={{ borderColor: "var(--border-default)" }}>
                  <iframe
                    src={toYoutubeEmbedUrl(activeLesson.youtubeUrl)}
                    title={activeLesson.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm" style={{ borderColor: "var(--border-default)", background: "var(--bg-card)", color: "var(--text-muted)" }}>
                  <span>Bu darsda video yo&apos;q</span>
                </div>
              )}

              {activeLesson.description ? (
                <div className="rounded-lg border p-4" style={{ borderColor: "var(--border-default)", background: "var(--clr-dust)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Qisqa tavsif</p>
                  <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>{activeLesson.description}</p>
                </div>
              ) : null}

              {activeLesson.content ? (
                <div className="lesson-content-wrapper rounded-lg border p-5 shadow-sm" style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Dars matni</p>
                  <div
                    className="lesson-content mt-3 text-base leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
                    style={{ color: "var(--text-primary)" }}
                    dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
                  <FileText className="size-4" style={{ color: "var(--clr-bronze)" }} />
                  Materiallar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeLesson.materials.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-sm" style={{ borderColor: "var(--border-default)", background: "var(--clr-dust)", color: "var(--text-muted)" }}>
                    Qo'shimcha materiallar yo'q
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeLesson.materials.map((material) => (
                      <a
                        key={material.id}
                        href={material.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-lg border p-3 text-left transition hover:opacity-90"
                        style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--clr-dust)", color: "var(--clr-bronze)" }}>
                          <FileText className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {material.fileName}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Yuklab olish</span>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
              <CardHeader>
                <CardTitle style={{ color: "var(--text-primary)" }}>Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!activeLesson.quiz || (activeLesson.quiz.questions?.length ?? 0) === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Bu dars uchun test mavjud emas.</p>
                ) : (
                  <>
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
                      <div className="space-y-2">
                        <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--clr-gold)", background: "var(--clr-dust)", color: "var(--clr-bronze)" }}>
                          Siz bu dars testidan o&apos;tgansiz.
                          {activeLesson.progress.lastAttemptScore != null && (
                            <span className="ml-1">(Birinchi ball: {Math.round(activeLesson.progress.lastAttemptScore)}%)</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={onStartQuiz} variant="outline">
                            Qayta ishlash
                          </Button>
                          {nextLesson ? (
                            <Button variant="outline" onClick={() => setActiveLessonId(nextLesson.id)}>
                              Keyingi darsga o&apos;tish
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button onClick={onStartQuiz}>Testni boshlash</Button>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Test yangi attempt-runner sahifasida ochiladi (timer, autosave va anti-leave himoyasi bilan).
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
            <CardHeader>
              <CardTitle style={{ color: "var(--text-primary)" }}>Kurs yakuniy testi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!finalQuiz || (finalQuiz.questions?.length ?? 0) === 0 ? (
                <>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Bu kurs uchun yakuniy test hali sozlanmagan.</p>
                  {certificate ? (
                    <div className="mt-3 space-y-3 rounded-lg border p-4" style={{ borderColor: "var(--clr-gold)", background: "var(--clr-dust)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--clr-bronze)" }}>Sertifikat mavjud.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <a href={`/api/certificates/${certificate.uuid}/pdf?download=1`} target="_blank" rel="noreferrer">Sertifikatni yuklab olish</a>
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
                    <div className="mt-3 space-y-2">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {query.data.enrollment.completedLessons >= query.data.enrollment.totalLessons
                          ? "Barcha darslarni tugatgan bo'lsangiz sertifikat olishingiz mumkin."
                          : `Sertifikat olish uchun barcha darslarni tugating (${query.data.enrollment.completedLessons}/${query.data.enrollment.totalLessons}).`}
                      </p>
                      <Button
                        onClick={onRequestCertificate}
                        disabled={generatingCert || query.data.enrollment.completedLessons < query.data.enrollment.totalLessons}
                      >
                        {generatingCert ? "Yuklanmoqda..." : "Sertifikat olish"}
                      </Button>
                    </div>
                  )}
                </>
              ) : certificate ? (
                <div className="space-y-3 rounded-lg border p-4" style={{ borderColor: "var(--clr-gold)", background: "var(--clr-dust)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--clr-bronze)" }}>Yakuniy test muvaffaqiyatli topshirilgan.</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Final score: {certificate.finalScore}%</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={`/api/certificates/${certificate.uuid}/pdf?download=1`} target="_blank" rel="noreferrer">
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
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
                    <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--border-default)", background: "var(--clr-dust)", color: "var(--text-muted)" }}>
                      Yakuniy test ochilishi uchun barcha dars testlaridan o'tishingiz kerak.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button onClick={onStartFinalQuiz}>Yakuniy testni boshlash</Button>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
        <Card className="border-[var(--border-default)]" style={{ background: "var(--bg-card)" }}>
          <CardContent className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>Dars tanlang.</CardContent>
        </Card>
      )}
    </div>
  );
}
