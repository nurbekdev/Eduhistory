"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUESTION_TYPES_OPTION_BASED = ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"] as const;

type QuestionPayload = {
  id: string;
  text: string;
  explanation: string | null;
  type: string;
  metadata?: unknown;
  options: Array< { id: string; text: string } >;
};

type AttemptPayload = {
  id: string;
  status: "IN_PROGRESS" | "PASSED" | "FAILED" | "SUBMITTED";
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  scorePercent: number;
  remainingSeconds?: number;
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isFinal: boolean;
    passingScore: number;
    attemptLimit: number;
    timeLimitMinutes: number;
    course: { id: string; title: string };
    questions: QuestionPayload[];
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
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["quiz-attempt", attemptId],
    queryFn: () => fetchAttempt(attemptId),
  });

  const draftKey = `quiz-draft:${attemptId}`;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[] | Record<string, unknown>>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SubmitResponse | null>(null);

  const hasLoadedDraftRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const questions = query.data?.quiz.questions ?? [];

  function isAnswered(question: QuestionPayload, value: string[] | Record<string, unknown> | undefined): boolean {
    if (value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (QUESTION_TYPES_OPTION_BASED.includes(question.type as (typeof QUESTION_TYPES_OPTION_BASED)[number])) return false;
    if (question.type === "NUMERICAL") return typeof (value as { number?: number }).number === "number" && Number.isFinite((value as { number: number }).number);
    if (question.type === "MATCHING") return Array.isArray((value as { pairs?: unknown }).pairs) && (value as { pairs: unknown[] }).pairs.length > 0;
    if (question.type === "CLOZE") return Array.isArray((value as { blanks?: unknown }).blanks);
    return false;
  }

  const answeredCount = questions.filter((q) => isAnswered(q, selectedAnswers[q.id])).length;

  const isInProgress = query.data?.status === "IN_PROGRESS" && !submittedResult;

  useEffect(() => {
    if (!query.data || hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { answers?: Record<string, string[] | Record<string, unknown>> };
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
      const raw = prev[questionId];
      const existing = Array.isArray(raw) ? raw : [];
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

  const buildAnswerPayload = (question: QuestionPayload, raw: string[] | Record<string, unknown> | undefined) => {
    if (raw === undefined) {
      return QUESTION_TYPES_OPTION_BASED.includes(question.type as (typeof QUESTION_TYPES_OPTION_BASED)[number]) ? [] : {};
    }
    if (Array.isArray(raw)) return raw;
    if (question.type === "MATCHING") {
      const meta = (question.metadata ?? {}) as { pairs?: { left: string; right: string }[] };
      const pairs = meta.pairs ?? [];
      const idxPairs = (raw as { pairs?: { leftIndex: number; rightIndex: number }[] }).pairs ?? [];
      return {
        pairs: idxPairs.map((p) => ({
          left: pairs[p.leftIndex]?.left ?? "",
          right: pairs[p.rightIndex]?.right ?? "",
        })),
      };
    }
    return raw;
  };

  const onSubmit = async (auto = false) => {
    if (!query.data || submitting) return;
    setSubmitting(true);
    const payload = {
      attemptId: query.data.id,
      answers: query.data.quiz.questions.map((question) => {
        const raw = selectedAnswers[question.id];
        return {
          questionId: question.id,
          selectedOptionIds: buildAnswerPayload(question, raw),
        };
      }),
    };

    const response = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    const text = await response.text();
    let body: SubmitResponse & { message?: string };
    try {
      body = text ? (JSON.parse(text) as SubmitResponse & { message?: string }) : ({} as SubmitResponse & { message?: string });
    } catch {
      body = {} as SubmitResponse & { message?: string };
    }
    if (!response.ok) {
      toast.error(body.message ?? "Quizni yakunlashda xatolik yuz berdi.");
      return;
    }

    window.localStorage.removeItem(draftKey);
    setSubmittedResult(body);

    const courseId = query.data?.quiz?.course?.id;
    if (courseId) {
      queryClient.invalidateQueries({ queryKey: ["course-player", courseId] });
    }

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
              const answered = isAnswered(question, selectedAnswers[question.id]);
              const active = index === currentQuestionIndex;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition dark:border-slate-700 dark:bg-slate-800/50 ${
                    active
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30"
                      : answered
                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:hover:bg-slate-800"
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
            {activeQuestion && QUESTION_TYPES_OPTION_BASED.includes(activeQuestion.type as (typeof QUESTION_TYPES_OPTION_BASED)[number]) && (
              <div className="space-y-2">
                {(activeQuestion.options ?? []).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(activeQuestion.id, option.id, activeQuestion.type as "MULTIPLE_CHOICE" | "MULTIPLE_SELECT")}
                    className={`w-full rounded-md border px-3 py-3 text-left text-sm transition dark:border-slate-600 dark:bg-slate-800/50 ${
                      (selectedAnswers[activeQuestion.id] as string[] | undefined)?.includes(option.id)
                        ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/30"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
            )}

            {activeQuestion?.type === "NUMERICAL" && (
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-slate-300">Raqamli javob</label>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  value={(selectedAnswers[activeQuestion.id] as { number?: number } | undefined)?.number ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [activeQuestion.id]: { number: v },
                    }));
                  }}
                />
              </div>
            )}

            {activeQuestion?.type === "MATCHING" && (() => {
              const meta = (activeQuestion.metadata ?? {}) as { pairs?: { left: string; right: string }[] };
              const pairs = meta.pairs ?? [];
              const current = (selectedAnswers[activeQuestion.id] as { pairs?: { leftIndex: number; rightIndex: number }[] } | undefined)?.pairs ?? [];
              return (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-slate-400">Chap elementni o'ng bilan moslashtiring.</p>
                  <div className="space-y-2">
                    {pairs.map((pair, leftIndex) => (
                      <div key={leftIndex} className="flex items-center gap-2">
                        <span className="min-w-[120px] rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800">
                          {pair.left || "—"}
                        </span>
                        <select
                          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          value={current.find((p) => p.leftIndex === leftIndex)?.rightIndex ?? ""}
                          onChange={(e) => {
                            const rightIndex = e.target.value === "" ? -1 : Number(e.target.value);
                            setSelectedAnswers((prev) => {
                              const prevPairs = (prev[activeQuestion.id] as { pairs?: { leftIndex: number; rightIndex: number }[] } | undefined)?.pairs ?? [];
                              const next = prevPairs.filter((p) => p.leftIndex !== leftIndex);
                              if (rightIndex >= 0) next.push({ leftIndex, rightIndex });
                              return { ...prev, [activeQuestion.id]: { pairs: next } };
                            });
                          }}
                        >
                          <option value="">Tanlang</option>
                          {pairs.map((p, ri) => (
                            <option key={ri} value={ri}>
                              {p.right || "—"}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {activeQuestion?.type === "CLOZE" && (() => {
              const meta = (activeQuestion.metadata ?? {}) as { parts?: { type: string; value: string }[] };
              const parts = meta.parts ?? [];
              const blankIndexes = parts.map((p, i) => (p.type === "blank" ? i : -1)).filter((i) => i >= 0);
              const currentBlanks = (selectedAnswers[activeQuestion.id] as { blanks?: string[] } | undefined)?.blanks ?? [];
              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-1 text-sm">
                    {parts.map((part, index) =>
                      part.type === "blank" ? (
                        <input
                          key={index}
                          type="text"
                          className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="..."
                          value={currentBlanks[blankIndexes.indexOf(index)] ?? ""}
                          onChange={(e) => {
                            const idx = blankIndexes.indexOf(index);
                            setSelectedAnswers((prev) => {
                              const prevBlanks = (prev[activeQuestion.id] as { blanks?: string[] } | undefined)?.blanks ?? [];
                              const next = [...prevBlanks];
                              while (next.length <= idx) next.push("");
                              next[idx] = e.target.value;
                              return { ...prev, [activeQuestion.id]: { blanks: next } };
                            });
                          }}
                        />
                      ) : (
                        <span key={index}>{part.value}</span>
                      )
                    )}
                  </div>
                </div>
              );
            })()}

            {(activeQuestion?.type === "DRAG_DROP_IMAGE" || activeQuestion?.type === "DRAG_DROP_TEXT") && (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Ushbu savol turi hozircha sinov rejimida. Keyingi yangilanishda to'liq qo'llab-quvvatlanadi.
              </p>
            )}

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
