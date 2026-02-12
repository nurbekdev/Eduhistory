"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttemptPayload = {
  id: string;
  status: "IN_PROGRESS" | "PASSED" | "FAILED" | "SUBMITTED";
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  scorePercent: number;
  /** Server-computed so client/server time drift doesn't end quiz immediately */
  remainingSeconds?: number;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isFinal: boolean;
    passingScore: number;
    attemptLimit: number;
    timeLimitMinutes: number;
    course: {
      id: string;
      title: string;
    };
    questions: Array<{
      id: string;
      text: string;
      explanation: string | null;
      type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT";
      options: Array<{
        id: string;
        text: string;
      }>;
    }>;
  };
};

type SubmitResponse = {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  certificate?: {
    uuid?: string;
  };
};

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const sec = (safe % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

async function fetchAttempt(attemptId: string): Promise<AttemptPayload> {
  const response = await fetch(`/api/quiz/attempt/${attemptId}`);
  if (!response.ok) {
    const body = (await response.json()) as { message?: string };
    throw new Error(body.message ?? "Quiz urinishini yuklashda xatolik yuz berdi.");
  }
  return response.json();
}

export function QuizAttemptRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["quiz-attempt", attemptId],
    queryFn: () => fetchAttempt(attemptId),
  });

  const draftKey = `quiz-draft:${attemptId}`;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SubmitResponse | null>(null);

  const hasLoadedDraftRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const questions = query.data?.quiz.questions ?? [];
  const answeredCount = questions.filter((question) => (selectedAnswers[question.id] ?? []).length > 0).length;

  const isInProgress = query.data?.status === "IN_PROGRESS" && !submittedResult;

  useEffect(() => {
    if (!query.data || hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { answers?: Record<string, string[]> };
      if (parsed.answers) {
        setSelectedAnswers(parsed.answers);
        toast.success("Quiz qoralamasi tiklandi.");
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, query.data]);

  useEffect(() => {
    if (!query.data) return;
    if (query.data.status === "IN_PROGRESS" && typeof query.data.remainingSeconds === "number") {
      setRemainingSeconds(query.data.remainingSeconds);
      return;
    }
    const total = query.data.quiz.timeLimitMinutes * 60;
    const elapsed = Math.floor((Date.now() - new Date(query.data.startedAt).getTime()) / 1000);
    setRemainingSeconds(Math.max(0, total - elapsed));
  }, [query.data]);

  useEffect(() => {
    if (!isInProgress) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInProgress]);

  useEffect(() => {
    if (!isInProgress || remainingSeconds === null || remainingSeconds > 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void onSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInProgress, remainingSeconds]);

  useEffect(() => {
    if (!isInProgress) return;
    setSavingDraft(true);
    const timer = setTimeout(() => {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          answers: selectedAnswers,
          savedAt: new Date().toISOString(),
        }),
      );
      setSavingDraft(false);
      setLastSavedAt(new Date());
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, isInProgress, selectedAnswers]);

  useEffect(() => {
    if (!isInProgress) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Quiz yakunlanmagan. Chiqishni tasdiqlaysizmi?";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInProgress]);

  const toggleOption = (questionId: string, optionId: string, type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT") => {
    setSelectedAnswers((prev) => {
      const existing = prev[questionId] ?? [];
      if (type === "MULTIPLE_CHOICE") {
        return {
          ...prev,
          [questionId]: [optionId],
        };
      }
      const next = existing.includes(optionId) ? existing.filter((id) => id !== optionId) : [...existing, optionId];
      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  const onSubmit = async (auto = false) => {
    if (!query.data || submitting) return;
    setSubmitting(true);
    const payload = {
      attemptId: query.data.id,
      answers: query.data.quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: selectedAnswers[question.id] ?? [],
      })),
    };

    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    const body = (await response.json()) as SubmitResponse & { message?: string };
    if (!response.ok) {
      toast.error(body.message ?? "Quizni yakunlashda xatolik yuz berdi.");
      return;
    }

    window.localStorage.removeItem(draftKey);
    setSubmittedResult(body);

    if (auto) {
      toast.error("Vaqt tugadi. Quiz avtomatik yakunlandi.");
    } else {
      toast.success("Quiz muvaffaqiyatli yakunlandi.");
    }

    setTimeout(() => {
      router.push(`/natijalar/${attemptId}`);
    }, 500);
  };

  if (query.isLoading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-zinc-600">Quiz ma'lumotlari yuklanmoqda...</div>;
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-red-600">
        {(query.error as Error)?.message ?? "Quiz ma'lumotini yuklashda xatolik yuz berdi."}
      </div>
    );
  }

  if (!isInProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Urinish yakunlangan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-700">Bu attempt allaqachon yakunlangan.</p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/natijalar/${attemptId}`}>Natijani ko'rish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/player/${query.data.quiz.course.id}`}>Kurs playerga qaytish</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-4">
      <Card className="sticky top-20 z-20 border-emerald-200 bg-white/95 backdrop-blur">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{query.data.quiz.title}</p>
            <p className="text-xs text-zinc-500">{query.data.quiz.course.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Attempt #{query.data.attemptNumber}</Badge>
            <Badge>{answeredCount}/{questions.length} javob berilgan</Badge>
            <Badge variant={remainingSeconds !== null && remainingSeconds <= 60 ? "warning" : "default"} className="gap-1">
              <Clock3 className="size-3.5" />
              {remainingSeconds === null ? "–:–" : formatRemaining(remainingSeconds)}
            </Badge>
            <Badge variant="locked" className="gap-1">
              <Save className="size-3.5" />
              {savingDraft
                ? "Saqlanmoqda..."
                : lastSavedAt
                  ? `Saqlandi ${lastSavedAt.toLocaleTimeString("uz-UZ")}`
                  : "Qoralama yo'q"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Savol navigator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.map((question, index) => {
              const answered = (selectedAnswers[question.id] ?? []).length > 0;
              const active = index === currentQuestionIndex;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50"
                      : answered
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  Savol {index + 1}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{currentQuestionIndex + 1}. {activeQuestion?.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {activeQuestion?.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(activeQuestion.id, option.id, activeQuestion.type)}
                  className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                    (selectedAnswers[activeQuestion.id] ?? []).includes(option.id)
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <span>{option.text}</span>
                </button>
              ))}
            </div>

            {activeQuestion?.explanation ? (
              <div className="rounded-md border bg-zinc-50 p-3 text-xs text-zinc-600">
                <TriangleAlert className="mr-1 inline size-3.5" />
                Eslatma: {activeQuestion.explanation}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentQuestionIndex === 0}
              >
                Oldingi
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Keyingi
                </Button>
                <Button onClick={() => void onSubmit(false)} disabled={submitting}>
                  {submitting ? "Yakunlanmoqda..." : "Quizni yakunlash"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
