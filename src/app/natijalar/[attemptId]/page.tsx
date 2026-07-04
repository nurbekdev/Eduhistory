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
        <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
              </svg>
              Tabriklaymiz! Sertifikat olindingiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PDF preview */}
            <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg dark:border-amber-800 dark:bg-slate-900">
              <iframe
                title="Sertifikat"
                src={`/api/certificates/${attempt.certificate.uuid}/pdf#view=FitH&toolbar=0&navpanes=0`}
                className="aspect-[595/842] w-full border-0"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700">
                <a href={`/api/certificates/${attempt.certificate.uuid}/pdf?download=1`} target="_blank" rel="noreferrer">
                  PDF Yuklab olish
                </a>
              </Button>
              <Button asChild variant="outline" className="border-amber-300 dark:border-amber-700">
                <Link href={`/sertifikat/${attempt.certificate.uuid}`}>Sertifikatni tekshirish</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/sertifikatlar">Barcha sertifikatlar</Link>
              </Button>
            </div>
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
