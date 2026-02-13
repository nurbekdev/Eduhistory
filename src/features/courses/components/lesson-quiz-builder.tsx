"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/locale-provider";

const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
  "MATCHING",
  "CLOZE",
  "NUMERICAL",
  "DRAG_DROP_IMAGE",
  "DRAG_DROP_TEXT",
] as const;

type QuizOption = {
  id?: string;
  text: string;
  isCorrect: boolean;
};

type QuestionMetadata =
  | { pairs?: { left: string; right: string }[] }
  | { parts?: { type: "text" | "blank"; value: string }[] }
  | { correct?: number; tolerance?: number }
  | { imageUrl?: string; zones?: { id: string; label: string }[]; items?: { id: string; text: string; correctZoneId: string }[] }
  | { textWithBlanks?: string; items?: { id: string; text: string; correctDropId: string }[] }
  | Record<string, unknown>;

type QuizQuestion = {
  id?: string;
  text: string;
  explanation?: string | null;
  type: (typeof QUESTION_TYPES)[number];
  options: QuizOption[];
  metadata?: QuestionMetadata | null;
};

type QuizData = {
  id?: string;
  title: string;
  description?: string | null;
  passingScore: number;
  attemptLimit: number;
  timeLimitMinutes?: number | null;
  questions: QuizQuestion[];
};

type LessonQuizBuilderProps = {
  saveUrl: string;
  initialQuiz: QuizData | null;
  defaultQuizTitle: string;
  panelTitle?: string;
  onSaved: () => Promise<void> | void;
};

const OPTION_BASED_TYPES = ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"];

function getDefaultOptionsForType(type: string): QuizOption[] {
  if (type === "TRUE_FALSE") {
    return [
      { text: "To'g'ri", isCorrect: true },
      { text: "Noto'g'ri", isCorrect: false },
    ];
  }
  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_SELECT") {
    return [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ];
  }
  return [];
}

function getDefaultMetadataForType(type: string): QuestionMetadata | undefined {
  if (type === "MATCHING") return { pairs: [{ left: "", right: "" }] };
  if (type === "CLOZE") return { parts: [{ type: "text", value: "" }] };
  if (type === "NUMERICAL") return { correct: 0, tolerance: 0 };
  if (type === "DRAG_DROP_IMAGE") return { imageUrl: "", zones: [], items: [] };
  if (type === "DRAG_DROP_TEXT") return { textWithBlanks: "", items: [] };
  return undefined;
}

export function LessonQuizBuilder({
  saveUrl,
  initialQuiz,
  defaultQuizTitle,
  panelTitle = "Quiz Builder",
  onSaved,
}: LessonQuizBuilderProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizData>(() => ({
    title: initialQuiz?.title ?? defaultQuizTitle,
    description: initialQuiz?.description ?? "",
    passingScore: initialQuiz?.passingScore ?? 70,
    attemptLimit: initialQuiz?.attemptLimit ?? 3,
    timeLimitMinutes: initialQuiz?.timeLimitMinutes ?? null,
    questions:
      initialQuiz?.questions?.map((question) => ({
        id: question.id,
        text: question.text,
        explanation: question.explanation ?? "",
        type: question.type as (typeof QUESTION_TYPES)[number],
        options: question.options?.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })) ?? getDefaultOptionsForType(question.type),
        metadata: question.metadata ?? getDefaultMetadataForType(question.type),
      })) ?? [
        {
          text: "",
          explanation: "",
          type: "MULTIPLE_CHOICE",
          options: getDefaultOptionsForType("MULTIPLE_CHOICE"),
        },
      ],
  }));

  const questionCount = useMemo(() => quiz.questions.length, [quiz.questions.length]);

  const updateQuestion = (index: number, data: Partial<QuizQuestion>) => {
    setQuiz((prev) => {
      const next = [...prev.questions];
      const current = next[index];
      if (data.type && data.type !== current.type) {
        next[index] = {
          ...current,
          ...data,
          options: getDefaultOptionsForType(data.type),
          metadata: getDefaultMetadataForType(data.type) ?? current.metadata,
        };
      } else {
        next[index] = { ...current, ...data };
      }
      return { ...prev, questions: next };
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, data: Partial<QuizOption>) => {
    setQuiz((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[questionIndex].options];
      options[optionIndex] = { ...options[optionIndex], ...data };
      questions[questionIndex] = { ...questions[questionIndex], options };
      return { ...prev, questions };
    });
  };

  const updateMetadata = (questionIndex: number, metadata: QuestionMetadata) => {
    setQuiz((prev) => {
      const next = [...prev.questions];
      next[questionIndex] = { ...next[questionIndex], metadata };
      return { ...prev, questions: next };
    });
  };

  const onSave = async () => {
    const normalizedTitle = quiz.title.trim();
    if (normalizedTitle.length < 3) {
      toast.error("Test nomi kamida 3 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (!Number.isFinite(quiz.passingScore) || quiz.passingScore < 1 || quiz.passingScore > 100) {
      toast.error("Passing score 1 dan 100 gacha bo'lishi kerak.");
      return;
    }

    if (!Number.isFinite(quiz.attemptLimit) || quiz.attemptLimit < 1 || quiz.attemptLimit > 10) {
      toast.error("Urinish limiti 1 dan 10 gacha bo'lishi kerak.");
      return;
    }

    if (quiz.timeLimitMinutes != null && (quiz.timeLimitMinutes < 0 || quiz.timeLimitMinutes > 300)) {
      toast.error("Vaqt limiti 0–300 daqiqa orasida bo'lishi kerak.");
      return;
    }

    let payload: QuizData;
    try {
      const normalizedQuestions = quiz.questions.map((question, questionIndex) => {
        const text = question.text.trim();
        const explanation = (question.explanation ?? "").trim();

        if (text.length < 5) {
          throw new Error(`Savol #${questionIndex + 1} matni kamida 5 ta belgi bo'lishi kerak.`);
        }

        if (OPTION_BASED_TYPES.includes(question.type)) {
          const options = (question.options ?? []).map((o) => ({ ...o, text: o.text.trim() }));
          if (options.length < 2) {
            throw new Error(`Savol #${questionIndex + 1} uchun kamida 2 ta variant bo'lishi kerak.`);
          }
          if (options.some((option) => option.text.length < 1)) {
            throw new Error(`Savol #${questionIndex + 1} variant matnlari bo'sh bo'lmasligi kerak.`);
          }
          const correctCount = options.filter((o) => o.isCorrect).length;
          if (question.type === "MULTIPLE_CHOICE" && correctCount !== 1) {
            throw new Error(`Savol #${questionIndex + 1} (bitta javob) uchun aniq 1 ta to'g'ri javob bo'lishi kerak.`);
          }
          if (question.type === "MULTIPLE_SELECT" && correctCount < 1) {
            throw new Error(`Savol #${questionIndex + 1} (ko'p javob) uchun kamida 1 ta to'g'ri javob bo'lishi kerak.`);
          }
          if (question.type === "TRUE_FALSE" && correctCount !== 1) {
            throw new Error(`Savol #${questionIndex + 1} (to'g'ri/noto'g'ri) uchun bitta to'g'ri javob belgilang.`);
          }
          return { ...question, text, explanation, options, metadata: undefined };
        }

        return {
          ...question,
          text,
          explanation,
          options: [],
          metadata: question.metadata ?? undefined,
        };
      });

      payload = {
        ...quiz,
        title: normalizedTitle,
        description: (quiz.description ?? "").trim(),
        timeLimitMinutes: quiz.timeLimitMinutes ?? undefined,
        questions: normalizedQuestions,
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz ma'lumotlari noto'g'ri.");
      return;
    }

    setSaving(true);
    const response = await fetch(saveUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Quizni saqlashda xatolik yuz berdi.");
      return;
    }

    toast.success("Quiz muvaffaqiyatli saqlandi.");
    await onSaved();
  };

  const typeLabel = (type: string) => {
    const key = {
      MULTIPLE_CHOICE: "quiz.singleChoice",
      MULTIPLE_SELECT: "quiz.multipleChoice",
      TRUE_FALSE: "quiz.trueFalse",
      MATCHING: "quiz.matching",
      CLOZE: "quiz.cloze",
      NUMERICAL: "quiz.numerical",
      DRAG_DROP_IMAGE: "quiz.dragImage",
      DRAG_DROP_TEXT: "quiz.dragText",
    }[type];
    return key ? t(key) : type;
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{panelTitle}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="warning">{questionCount} ta savol</Badge>
          <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
            {open ? "Yopish" : "Ochish"}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium dark:text-slate-300">Test nomi</label>
              <Input
                value={quiz.title}
                onChange={(e) => setQuiz((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium dark:text-slate-300">Tavsif</label>
              <Textarea
                value={quiz.description ?? ""}
                onChange={(e) => setQuiz((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium dark:text-slate-300">Passing score (%)</label>
              <Input
                type="number"
                value={quiz.passingScore}
                onChange={(e) => setQuiz((prev) => ({ ...prev, passingScore: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium dark:text-slate-300">Urinish limiti</label>
              <Input
                type="number"
                value={quiz.attemptLimit}
                onChange={(e) => setQuiz((prev) => ({ ...prev, attemptLimit: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium dark:text-slate-300">{t("quiz.timeLimit")} (0 = cheksiz)</label>
              <Input
                type="number"
                min={0}
                max={300}
                value={quiz.timeLimitMinutes ?? ""}
                placeholder="20"
                onChange={(e) =>
                  setQuiz((prev) => ({
                    ...prev,
                    timeLimitMinutes: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((question, questionIndex) => (
              <div key={`q-${questionIndex}`} className="rounded-lg border p-4 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold dark:text-slate-200">Savol #{questionIndex + 1}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setQuiz((prev) => ({
                        ...prev,
                        questions: prev.questions.filter((_, i) => i !== questionIndex),
                      }))
                    }
                    disabled={quiz.questions.length <= 1}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Savol matni"
                    value={question.text}
                    onChange={(e) => updateQuestion(questionIndex, { text: e.target.value })}
                  />
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Savol turi</label>
                    <SelectNative
                      value={question.type}
                      onChange={(e) =>
                        updateQuestion(questionIndex, {
                          type: e.target.value as (typeof QUESTION_TYPES)[number],
                        })
                      }
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {typeLabel(type)}
                        </option>
                      ))}
                    </SelectNative>
                  </div>

                  <Textarea
                    placeholder="Izoh (ixtiyoriy)"
                    value={question.explanation ?? ""}
                    onChange={(e) => updateQuestion(questionIndex, { explanation: e.target.value })}
                  />

                  {OPTION_BASED_TYPES.includes(question.type) && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Variantlar</label>
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={`opt-${questionIndex}-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            type={question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE" ? "radio" : "checkbox"}
                            name={`q-${questionIndex}`}
                            checked={option.isCorrect}
                            onChange={(e) => {
                              if ((question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && e.target.checked) {
                                const next = question.options.map((item, i) => ({
                                  ...item,
                                  isCorrect: i === optionIndex,
                                }));
                                updateQuestion(questionIndex, { options: next });
                                return;
                              }
                              updateOption(questionIndex, optionIndex, { isCorrect: e.target.checked });
                            }}
                          />
                          <Input
                            placeholder={`Variant ${optionIndex + 1}`}
                            value={option.text}
                            onChange={(e) => updateOption(questionIndex, optionIndex, { text: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateQuestion(questionIndex, {
                                options: question.options.filter((_, i) => i !== optionIndex),
                              })
                            }
                            disabled={question.options.length <= 2}
                          >
                            –
                          </Button>
                        </div>
                      ))}
                      {question.type !== "TRUE_FALSE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuestion(questionIndex, {
                              options: [...question.options, { text: "", isCorrect: false }],
                            })
                          }
                        >
                          + Variant qo'shish
                        </Button>
                      )}
                    </div>
                  )}

                  {question.type === "MATCHING" && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Juftliklar (chap | o'ng)</label>
                      {((question.metadata as { pairs?: { left: string; right: string }[] })?.pairs ?? [{ left: "", right: "" }]).map(
                        (pair, pairIndex) => (
                          <div key={pairIndex} className="flex gap-2">
                            <Input
                              placeholder="Chap"
                              value={pair.left}
                              onChange={(e) => {
                                const pairs = [...((question.metadata as { pairs?: { left: string; right: string }[] })?.pairs ?? [{ left: "", right: "" }])];
                                pairs[pairIndex] = { ...pairs[pairIndex], left: e.target.value };
                                updateMetadata(questionIndex, { pairs });
                              }}
                            />
                            <Input
                              placeholder="O'ng"
                              value={pair.right}
                              onChange={(e) => {
                                const pairs = [...((question.metadata as { pairs?: { left: string; right: string }[] })?.pairs ?? [{ left: "", right: "" }])];
                                pairs[pairIndex] = { ...pairs[pairIndex], right: e.target.value };
                                updateMetadata(questionIndex, { pairs });
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const pairs = ((question.metadata as { pairs?: { left: string; right: string }[] })?.pairs ?? []).filter(
                                  (_, i) => i !== pairIndex
                                );
                                updateMetadata(questionIndex, { pairs: pairs.length ? pairs : [{ left: "", right: "" }] });
                              }}
                            >
                              –
                            </Button>
                          </div>
                        )
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const pairs = [...((question.metadata as { pairs?: { left: string; right: string }[] })?.pairs ?? []), { left: "", right: "" }];
                          updateMetadata(questionIndex, { pairs });
                        }}
                      >
                        + Juftlik qo'shish
                      </Button>
                    </div>
                  )}

                  {question.type === "CLOZE" && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Matn va bo'shliqlar: [[javob]]</label>
                      <Textarea
                        placeholder="Masalan: Poytaxtimiz [[Toshkent]]. [[O'zbekiston]] mustaqil davlat."
                        value={
                          ((question.metadata as { parts?: { type: string; value: string }[] })?.parts ?? [])
                            .map((p) => (p.type === "blank" ? `[[${p.value}]]` : p.value))
                            .join("") || ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parts: { type: "text" | "blank"; value: string }[] = [];
                          let i = 0;
                          while (i < raw.length) {
                            const open = raw.indexOf("[[", i);
                            if (open === -1) {
                              parts.push({ type: "text", value: raw.slice(i) });
                              break;
                            }
                            if (open > i) parts.push({ type: "text", value: raw.slice(i, open) });
                            const close = raw.indexOf("]]", open + 2);
                            if (close === -1) {
                              parts.push({ type: "text", value: raw.slice(open) });
                              break;
                            }
                            parts.push({ type: "blank", value: raw.slice(open + 2, close) });
                            i = close + 2;
                          }
                          updateMetadata(questionIndex, { parts });
                        }}
                      />
                    </div>
                  )}

                  {question.type === "NUMERICAL" && (
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 dark:text-slate-400">To'g'ri javob (raqam)</label>
                        <Input
                          type="number"
                          value={(question.metadata as { correct?: number })?.correct ?? ""}
                          onChange={(e) =>
                            updateMetadata(questionIndex, {
                              ...(question.metadata as object),
                              correct: Number(e.target.value),
                              tolerance: (question.metadata as { tolerance?: number })?.tolerance ?? 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 dark:text-slate-400">Ruxsat (±)</label>
                        <Input
                          type="number"
                          min={0}
                          value={(question.metadata as { tolerance?: number })?.tolerance ?? ""}
                          onChange={(e) =>
                            updateMetadata(questionIndex, {
                              ...(question.metadata as object),
                              correct: (question.metadata as { correct?: number })?.correct ?? 0,
                              tolerance: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {(question.type === "DRAG_DROP_IMAGE" || question.type === "DRAG_DROP_TEXT") && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Metadata (JSON, keyinroq to'liq UI)</label>
                      <Textarea
                        className="font-mono text-xs"
                        placeholder={question.type === "DRAG_DROP_IMAGE" ? '{"imageUrl":"/img.png","zones":[],"items":[]}' : '{"textWithBlanks":"","items":[]}'}
                        value={JSON.stringify(question.metadata ?? {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value || "{}");
                            updateMetadata(questionIndex, parsed);
                          } catch {
                            // ignore invalid json while typing
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setQuiz((prev) => ({
                  ...prev,
                  questions: [
                    ...prev.questions,
                    {
                      text: "",
                      explanation: "",
                      type: "MULTIPLE_CHOICE",
                      options: getDefaultOptionsForType("MULTIPLE_CHOICE"),
                    },
                  ],
                }))
              }
            >
              + Savol qo'shish
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Quizni saqlash"}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
