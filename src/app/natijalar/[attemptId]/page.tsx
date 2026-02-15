import Link from "next/link";
import { AttemptStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { QuizResultEffect } from "../quiz-result-effect";

type ResultPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function ResultPage({ params }: ResultPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/kirish");

  const { attemptId } = await params;
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
      quiz: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          questions: {
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      answers: true,
      certificate: {
        select: {
          id: true,
          uuid: true,
          pdfUrl: true,
          finalScore: true,
        },
      },
    },
  });

  if (!attempt) return notFound();

  const canView =
    attempt.userId === session.user.id || session.user.role === Role.ADMIN || session.user.role === Role.INSTRUCTOR;
  if (!canView) {
    return redirect("/403");
  }

  const passed = attempt.status === AttemptStatus.PASSED;
  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));

  const courseId = attempt.quiz.course.id;
  const isLessonQuiz = !attempt.quiz.isFinal;

  return (
    <PageContainer className="space-y-6">
      <QuizResultEffect passed={passed} />

      <SectionTitle
        title="Quiz natijasi"
        description={`${attempt.quiz.course.title} kursi • ${attempt.quiz.isFinal ? "Yakuniy test" : "Dars testi"}`}
      />

      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          {passed && isLessonQuiz && (
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              <Link href={`/player/${courseId}`}>Keyingi darsga o'tish</Link>
            </Button>
          )}
          <Button asChild variant={passed && isLessonQuiz ? "outline" : "default"} className={passed && !isLessonQuiz ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
            <Link href={`/player/${courseId}`}>Kursga qaytish</Link>
          </Button>
          {!passed && (
            <Button asChild variant="outline">
              <Link href={`/player/${courseId}`}>Testni qayta topshirish</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Bosh sahifa</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Umumiy ball</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{attempt.scorePercent}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">To'g'ri javoblar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{attempt.correctCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Xato javoblar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{attempt.wrongCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Holat</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={passed ? "default" : "warning"}>{passed ? "Passed" : "Failed"}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p>Talaba: {attempt.user.fullName}</p>
          <p>Attempt #: {attempt.attemptNumber}</p>
          <p>
            Boshlangan vaqt: {new Date(attempt.startedAt).toLocaleString("uz-UZ")}
          </p>
          <p>
            Yakunlangan vaqt: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("uz-UZ") : "-"}
          </p>
          <p>
            Passing score: {attempt.quiz.passingScore}% • Attempt limit: {attempt.quiz.attemptLimit}
          </p>
        </CardContent>
      </Card>

      {attempt.quiz.isFinal && passed && attempt.certificate ? (
        <Card>
          <CardHeader>
            <CardTitle>Sertifikat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <a href={attempt.certificate.pdfUrl ?? "#"} target="_blank" rel="noreferrer">
                Sertifikat PDF
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/sertifikat/${attempt.certificate.uuid}`}>Verify sahifasi</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/sertifikatlar">Mening sertifikatlarim</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Savollar bo'yicha breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {attempt.quiz.questions.map((question, index) => {
            const answer = answerMap.get(question.id);
            const selectedIds = Array.isArray(answer?.selectedOptionIds) ? (answer?.selectedOptionIds as string[]) : [];
            return (
              <div key={question.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {index + 1}. {question.text}
                  </p>
                  <Badge variant={answer?.isCorrect ? "default" : "warning"}>{answer?.isCorrect ? "To'g'ri" : "Xato"}</Badge>
                </div>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    const isCorrect = option.isCorrect;
                    return (
                      <div
                        key={option.id}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50"
                            : isSelected
                              ? "border-amber-300 bg-amber-50"
                              : "border-zinc-200 bg-white"
                        }`}
                      >
                        {option.text}
                      </div>
                    );
                  })}
                </div>
                {question.explanation ? <p className="mt-2 text-xs text-zinc-500">Izoh: {question.explanation}</p> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
