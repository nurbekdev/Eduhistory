import { AttemptStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Avval tizimga kiring." }, { status: 401 });
  }

  const { courseId } = await context.params;
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId,
      },
    },
    include: {
      progress: true,
      course: {
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  materials: true,
                  quiz: {
                    include: {
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
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
          quizzes: {
            where: { isFinal: true },
            include: {
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
        },
      },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ message: "Siz bu kursga yozilmagansiz." }, { status: 404 });
  }

  const lessons = enrollment.course.modules.flatMap((moduleItem) => moduleItem.lessons);
  const progressMap = new Map(enrollment.progress.map((item) => [item.lessonId, item]));

  const mappedModules = enrollment.course.modules.map((moduleItem) => ({
    id: moduleItem.id,
    title: moduleItem.title,
    description: moduleItem.description,
    order: moduleItem.order,
    lessons: moduleItem.lessons.map((lesson) => {
      const progress = progressMap.get(lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        youtubeUrl: lesson.youtubeUrl,
        videoFileUrl: lesson.videoFileUrl,
        durationMinutes: lesson.durationMinutes,
        order: lesson.order,
        isPublished: lesson.isPublished,
        progress: progress
          ? {
              status: progress.status,
              attemptsUsed: progress.attemptsUsed,
              lastAttemptScore: progress.lastAttemptScore,
              completedAt: progress.completedAt,
            }
          : {
              status: "LOCKED",
              attemptsUsed: 0,
              lastAttemptScore: null,
              completedAt: null,
            },
        materials: lesson.materials,
        quiz: lesson.quiz
          ? {
              id: lesson.quiz.id,
              title: lesson.quiz.title,
              description: lesson.quiz.description,
              passingScore: lesson.quiz.passingScore,
              attemptLimit: lesson.quiz.attemptLimit,
              questions: lesson.quiz.questions.map((question) => ({
                id: question.id,
                text: question.text,
                explanation: question.explanation,
                type: question.type,
                options: question.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                })),
              })),
            }
          : null,
      };
    }),
  }));

  // Progress hisobi: faqat shu enrollment bo'yicha, cache ta'siri bo'lmasligi uchun
  const completedLessons = enrollment.progress.filter((p) => p.status === "COMPLETED").length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const finalQuiz = enrollment.course.quizzes[0] ?? null;
  const canStartFinalQuiz = totalLessons > 0 && completedLessons === totalLessons;
  const [certificate, finalAttemptsUsed] = await Promise.all([
    prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: enrollment.course.id,
        },
      },
      select: {
        id: true,
        uuid: true,
        pdfUrl: true,
        finalScore: true,
        issuedAt: true,
      },
    }),
    finalQuiz
      ? prisma.quizAttempt.count({
          where: {
            quizId: finalQuiz.id,
            userId: session.user.id,
            status: {
              in: [AttemptStatus.PASSED, AttemptStatus.FAILED],
            },
          },
        })
      : Promise.resolve(0),
  ]);

  // Har doim yangi ma'lumot (cache bo'lmasin)
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");

  return NextResponse.json(
    {
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      progressPercent,
      completedLessons,
      totalLessons,
    },
    course: {
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      status: enrollment.course.status,
      defaultPassingScore: enrollment.course.defaultPassingScore,
      defaultAttemptLimit: enrollment.course.defaultAttemptLimit,
      modules: mappedModules,
      finalQuiz: finalQuiz
        ? {
            id: finalQuiz.id,
            title: finalQuiz.title,
            description: finalQuiz.description,
            passingScore: finalQuiz.passingScore,
            attemptLimit: finalQuiz.attemptLimit,
            attemptsUsed: finalAttemptsUsed,
            questions: finalQuiz.questions.map((question) => ({
              id: question.id,
              text: question.text,
              explanation: question.explanation,
              type: question.type,
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text,
              })),
            })),
            canStart: canStartFinalQuiz,
          }
        : null,
      certificate,
    },
  },
  { headers }
  );
}
