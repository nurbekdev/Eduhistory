"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";

type QuizOption = {
  id?: string;
  text: string;
  isCorrect: boolean;
};

type QuizQuestion = {
  id?: string;
  text: string;
  explanation?: string | null;
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT";
  options: QuizOption[];
};

type QuizData = {
  id?: string;
  title: string;
  description?: string | null;
  passingScore: number;
  attemptLimit: number;
  questions: QuizQuestion[];
};

type LessonQuizBuilderProps = {
  saveUrl: string;
  initialQuiz: QuizData | null;
  defaultQuizTitle: string;
  panelTitle?: string;
  onSaved: () => Promise<void> | void;
};

export function LessonQuizBuilder({
  saveUrl,
  initialQuiz,
  defaultQuizTitle,
  panelTitle = "Quiz Builder",
  onSaved,
}: LessonQuizBuilderProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizData>(() => ({
    title: initialQuiz?.title ?? defaultQuizTitle,
    description: initialQuiz?.description ?? "",
    passingScore: initialQuiz?.passingScore ?? 70,
    attemptLimit: initialQuiz?.attemptLimit ?? 3,
    questions:
      initialQuiz?.questions?.map((question) => ({
        id: question.id,
        text: question.text,
        explanation: question.explanation ?? "",
        type: question.type,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })) ?? [
        {
          text: "",
          explanation: "",
          type: "MULTIPLE_CHOICE",
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
          ],
        },
      ],
  }));

  const questionCount = useMemo(() => quiz.questions.length, [quiz.questions.length]);

  const updateQuestion = (index: number, data: Partial<QuizQuestion>) => {
    setQuiz((prev) => {
      const next = [...prev.questions];
      next[index] = { ...next[index], ...data };
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

    let payload: QuizData;
    try {
      const normalizedQuestions = quiz.questions.map((question, questionIndex) => {
        const text = question.text.trim();
        const explanation = (question.explanation ?? "").trim();
        const options = question.options.map((option) => ({
          ...option,
          text: option.text.trim(),
        }));

        if (text.length < 5) {
          throw new Error(`Savol #${questionIndex + 1} matni kamida 5 ta belgi bo'lishi kerak.`);
        }

        if (options.length < 2) {
          throw new Error(`Savol #${questionIndex + 1} uchun kamida 2 ta variant bo'lishi kerak.`);
        }

        if (options.some((option) => option.text.length < 1)) {
          throw new Error(`Savol #${questionIndex + 1} variant matnlari bo'sh bo'lmasligi kerak.`);
        }

        const correctCount = options.filter((option) => option.isCorrect).length;
        if (question.type === "MULTIPLE_CHOICE" && correctCount !== 1) {
          throw new Error(`Savol #${questionIndex + 1} (single choice) uchun faqat 1 ta to'g'ri javob bo'lishi kerak.`);
        }
        if (question.type === "MULTIPLE_SELECT" && correctCount < 1) {
          throw new Error(`Savol #${questionIndex + 1} (multiple select) uchun kamida 1 ta to'g'ri javob bo'lishi kerak.`);
        }

        return {
          ...question,
          text,
          explanation,
          options,
        };
      });

      payload = {
        ...quiz,
        title: normalizedTitle,
        description: (quiz.description ?? "").trim(),
        questions: normalizedQuestions,
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz ma'lumotlari noto'g'ri.");
      return;
    }

    setSaving(true);
    const response = await fetch(saveUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
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
              <label className="text-sm font-medium">Test nomi</label>
              <Input value={quiz.title} onChange={(event) => setQuiz((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Tavsif</label>
              <Textarea
                value={quiz.description ?? ""}
                onChange={(event) => setQuiz((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Passing score (%)</label>
              <Input
                type="number"
                value={quiz.passingScore}
                onChange={(event) =>
                  setQuiz((prev) => ({ ...prev, passingScore: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Urinish limiti</label>
              <Input
                type="number"
                value={quiz.attemptLimit}
                onChange={(event) => setQuiz((prev) => ({ ...prev, attemptLimit: Number(event.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((question, questionIndex) => (
              <div key={`q-${questionIndex}`} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Savol #{questionIndex + 1}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setQuiz((prev) => ({
                        ...prev,
                        questions: prev.questions.filter((_, index) => index !== questionIndex),
                      }))
                    }
                    disabled={quiz.questions.length <= 1}
                  >
                    O'chirish
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Savol matni"
                    value={question.text}
                    onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                  />
                  <SelectNative
                    value={question.type}
                    onChange={(event) =>
                      updateQuestion(questionIndex, {
                        type: event.target.value as "MULTIPLE_CHOICE" | "MULTIPLE_SELECT",
                      })
                    }
                  >
                    <option value="MULTIPLE_CHOICE">Multiple choice (1 to'g'ri)</option>
                    <option value="MULTIPLE_SELECT">Multiple select (bir nechta to'g'ri)</option>
                  </SelectNative>

                  <Textarea
                    placeholder="Izoh (ixtiyoriy)"
                    value={question.explanation ?? ""}
                    onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })}
                  />

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={`opt-${questionIndex}-${optionIndex}`} className="flex items-center gap-2">
                        <input
                          type={question.type === "MULTIPLE_CHOICE" ? "radio" : "checkbox"}
                          name={`q-${questionIndex}`}
                          checked={option.isCorrect}
                          onChange={(event) => {
                            if (question.type === "MULTIPLE_CHOICE" && event.target.checked) {
                              const next = question.options.map((item, index) => ({
                                ...item,
                                isCorrect: index === optionIndex,
                              }));
                              updateQuestion(questionIndex, { options: next });
                              return;
                            }
                            updateOption(questionIndex, optionIndex, { isCorrect: event.target.checked });
                          }}
                        />
                        <Input
                          placeholder={`Variant ${optionIndex + 1}`}
                          value={option.text}
                          onChange={(event) => updateOption(questionIndex, optionIndex, { text: event.target.value })}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateQuestion(questionIndex, {
                              options: question.options.filter((_, index) => index !== optionIndex),
                            })
                          }
                          disabled={question.options.length <= 2}
                        >
                          -
                        </Button>
                      </div>
                    ))}
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
                  </div>
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
                      options: [
                        { text: "", isCorrect: true },
                        { text: "", isCorrect: false },
                      ],
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
