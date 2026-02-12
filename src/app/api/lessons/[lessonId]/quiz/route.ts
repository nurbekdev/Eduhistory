import { QuestionType, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const quizBuilderSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  passingScore: z.number().int().min(1).max(100),
  attemptLimit: z.number().int().min(1).max(10),
  questions: z
    .array(
      z.object({
        text: z.string().min(5),
        explanation: z.string().optional(),
        type: z.nativeEnum(QuestionType),
        options: z
          .array(
            z.object({
              text: z.string().min(1),
              isCorrect: z.boolean(),
            }),
          )
          .min(2),
      }),
    )
    .min(1),
});

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const isManager = session?.user?.role === Role.ADMIN || session?.user?.role === Role.INSTRUCTOR;
  if (!session?.user?.id || !isManager) {
    return NextResponse.json({ message: "Sizda bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  const { lessonId } = await context.params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            select: { id: true, instructorId: true },
          },
        },
      },
      quiz: true,
    },
  });
  if (!lesson) {
    return NextResponse.json({ message: "Dars topilmadi." }, { status: 404 });
  }
  if (session.user.role !== Role.ADMIN && lesson.module.course.instructorId !== session.user.id) {
    return NextResponse.json({ message: "Bu dars testini boshqarishga ruxsat yo'q." }, { status: 403 });
  }

  const parsed = quizBuilderSchema.safeParse(await request.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issueMessage = issue ? `${issue.path.join(".") || "field"}: ${issue.message}` : "Quiz ma'lumotlari noto'g'ri.";
    return NextResponse.json({ message: issueMessage }, { status: 400 });
  }

  const invalidQuestion = parsed.data.questions.find((question) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (question.type === QuestionType.MULTIPLE_CHOICE) return correctCount !== 1;
    return correctCount < 1;
  });
  if (invalidQuestion) {
    return NextResponse.json(
      { message: "Savol variantlarida kamida bitta to'g'ri javob bo'lishi kerak." },
      { status: 400 },
    );
  }

  const quiz = await prisma.$transaction(async (tx) => {
    const targetQuiz =
      lesson.quiz ??
      (await tx.quiz.create({
        data: {
          courseId: lesson.module.course.id,
          lessonId,
          createdById: session.user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          passingScore: parsed.data.passingScore,
          attemptLimit: parsed.data.attemptLimit,
        },
      }));

    await tx.option.deleteMany({
      where: {
        question: {
          quizId: targetQuiz.id,
        },
      },
    });
    await tx.question.deleteMany({
      where: {
        quizId: targetQuiz.id,
      },
    });

    await tx.quiz.update({
      where: { id: targetQuiz.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        passingScore: parsed.data.passingScore,
        attemptLimit: parsed.data.attemptLimit,
        questions: {
          create: parsed.data.questions.map((question, questionIndex) => ({
            text: question.text,
            explanation: question.explanation,
            type: question.type,
            order: questionIndex + 1,
            options: {
              create: question.options.map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                order: optionIndex + 1,
              })),
            },
          })),
        },
      },
    });

    return tx.quiz.findUnique({
      where: { id: targetQuiz.id },
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
    });
  });

  return NextResponse.json(quiz);
}
