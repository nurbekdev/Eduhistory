import { Prisma, QuestionType, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const QUESTION_TYPE_VALUES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
  "MATCHING",
  "CLOZE",
  "NUMERICAL",
  "DRAG_DROP_IMAGE",
  "DRAG_DROP_TEXT",
] as const;

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().min(5),
  explanation: z.string().optional(),
  type: z.enum(QUESTION_TYPE_VALUES),
  metadata: z.any().optional().nullable(),
  options: z.array(optionSchema).optional().default([]),
});

const quizBuilderSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  passingScore: z.number().int().min(1).max(100),
  attemptLimit: z.number().int().min(1).max(10),
  timeLimitMinutes: z.number().int().min(0).max(300).optional().nullable(),
  questions: z.array(questionSchema).min(1),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON noto'g'ri yoki bo'sh." }, { status: 400 });
  }

  let parsed: { success: true; data: z.infer<typeof quizBuilderSchema> } | { success: false; error: z.ZodError };
  try {
    parsed = quizBuilderSchema.safeParse(body);
  } catch (err) {
    console.error("Quiz schema parse error:", err);
    return NextResponse.json({ message: "Quiz ma'lumotlari formati noto'g'ri." }, { status: 400 });
  }

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issueMessage = issue ? `${issue.path.join(".") || "field"}: ${issue.message}` : "Quiz ma'lumotlari noto'g'ri.";
    return NextResponse.json({ message: issueMessage }, { status: 400 });
  }

  const optionBasedTypes: QuestionType[] = [
    QuestionType.MULTIPLE_CHOICE,
    QuestionType.MULTIPLE_SELECT,
    QuestionType.TRUE_FALSE,
  ];
  for (let i = 0; i < parsed.data.questions.length; i++) {
    const q = parsed.data.questions[i];
    if (optionBasedTypes.includes(q.type)) {
      const needOptions = q.type === QuestionType.TRUE_FALSE ? 2 : 2;
      if (!q.options || q.options.length < needOptions) {
        return NextResponse.json(
          { message: `Savol #${i + 1}: variantlar kamida ${needOptions} ta bo'lishi kerak.` },
          { status: 400 },
        );
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (q.type === QuestionType.MULTIPLE_CHOICE && correctCount !== 1) {
        return NextResponse.json(
          { message: `Savol #${i + 1} (bitta javob): aniq 1 ta to'g'ri javob bo'lishi kerak.` },
          { status: 400 },
        );
      }
      if (q.type === QuestionType.MULTIPLE_SELECT && correctCount < 1) {
        return NextResponse.json(
          { message: `Savol #${i + 1} (ko'p javob): kamida 1 ta to'g'ri javob bo'lishi kerak.` },
          { status: 400 },
        );
      }
      if (q.type === QuestionType.TRUE_FALSE && correctCount !== 1) {
        return NextResponse.json(
          { message: `Savol #${i + 1} (to'g'ri/noto'g'ri): bitta to'g'ri javob belgilang.` },
          { status: 400 },
        );
      }
    }
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
          timeLimitMinutes: parsed.data.timeLimitMinutes ?? undefined,
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
        timeLimitMinutes: parsed.data.timeLimitMinutes ?? undefined,
        questions: {
          create: parsed.data.questions.map((question, questionIndex) => ({
            text: question.text,
            explanation: question.explanation,
            type: question.type as QuestionType,
            metadata: (question.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            order: questionIndex + 1,
            options: {
              create: (question.options ?? []).map((option, optionIndex) => ({
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
