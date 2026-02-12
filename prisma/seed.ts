import {
  PrismaClient,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  MaterialType,
  ProgressStatus,
  QuestionType,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("Eduhistory2026!", 10);

  const [, instructor, student] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@eduhistory.uz" },
      update: {
        fullName: "Eduhistory Admin",
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        fullName: "Eduhistory Admin",
        email: "admin@eduhistory.uz",
        passwordHash: defaultPassword,
        role: Role.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: "ustoz@eduhistory.uz" },
      update: {
        fullName: "Demo Ustoz",
        role: Role.INSTRUCTOR,
        isActive: true,
      },
      create: {
        fullName: "Demo Ustoz",
        email: "ustoz@eduhistory.uz",
        passwordHash: defaultPassword,
        role: Role.INSTRUCTOR,
      },
    }),
    prisma.user.upsert({
      where: { email: "talaba@eduhistory.uz" },
      update: {
        fullName: "Demo Talaba",
        role: Role.STUDENT,
        isActive: true,
      },
      create: {
        fullName: "Demo Talaba",
        email: "talaba@eduhistory.uz",
        passwordHash: defaultPassword,
        role: Role.STUDENT,
      },
    }),
  ]);

  await prisma.course.deleteMany({
    where: {
      slug: "ozbekiston-tarixi-asoslari",
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "robototexnika-asoslari" },
    update: {
      title: "Robototexnika asoslari",
      description: "Robototexnika bo'yicha boshlang'ichdan amaliy loyihagacha to'liq kurs.",
      category: "Robototexnika",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 180,
      instructorId: instructor.id,
      publishedAt: new Date(),
      defaultPassingScore: 70,
      defaultAttemptLimit: 3,
    },
    create: {
      title: "Robototexnika asoslari",
      slug: "robototexnika-asoslari",
      description: "Robototexnika bo'yicha boshlang'ichdan amaliy loyihagacha to'liq kurs.",
      category: "Robototexnika",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 180,
      instructorId: instructor.id,
      publishedAt: new Date(),
      defaultPassingScore: 70,
      defaultAttemptLimit: 3,
    },
  });

  await prisma.course.upsert({
    where: { slug: "it-foundation-maktab" },
    update: {
      title: "IT Foundation (Maktab uchun)",
      description: "Kompyuter savodxonligi, internet xavfsizligi va dasturlash kirish kursi.",
      category: "IT",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 120,
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
    create: {
      title: "IT Foundation (Maktab uchun)",
      slug: "it-foundation-maktab",
      description: "Kompyuter savodxonligi, internet xavfsizligi va dasturlash kirish kursi.",
      category: "IT",
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 120,
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  await prisma.course.upsert({
    where: { slug: "3d-modellashtirish-start" },
    update: {
      title: "3D modellashtirish start",
      description: "3D model yaratish, materiallar va render asoslarini o'rganing.",
      category: "3D",
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 150,
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
    create: {
      title: "3D modellashtirish start",
      slug: "3d-modellashtirish-start",
      description: "3D model yaratish, materiallar va render asoslarini o'rganing.",
      category: "3D",
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      durationMinutes: 150,
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  await prisma.quiz.deleteMany({ where: { courseId: course.id } });
  await prisma.module.deleteMany({ where: { courseId: course.id } });

  const module1 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: "1-modul: Robototexnika kirish",
      description: "Robototexnika asosiy tushunchalari va xavfsizlik qoidalari.",
      order: 1,
      lessons: {
        create: [
          {
            title: "1-dars: Robot va sensorlar",
            description: "Robot komponentlari va sensorlarning vazifasi.",
            youtubeUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
            content: "Bu darsda robot konstruktsiyasi va asosiy sensorlarni o'rganamiz.",
            order: 1,
            isPublished: true,
            durationMinutes: 20,
          },
          {
            title: "2-dars: Arduino bilan ishlash",
            description: "Arduino muhiti va birinchi oddiy sxema.",
            youtubeUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
            content: "Pinlar, breadboard va kodni yuklash bosqichlari.",
            order: 2,
            isPublished: true,
            durationMinutes: 22,
          },
        ],
      },
    },
    include: { lessons: true },
  });

  const module2 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: "2-modul: Amaliy loyiha",
      description: "Line follower va mini robot prototipi.",
      order: 2,
      lessons: {
        create: [
          {
            title: "3-dars: Robotni dasturlash",
            description: "Harakat algoritmlari va debugging amaliyoti.",
            youtubeUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
            content: "Sensor o'qish va motorlarni boshqarish misollari.",
            order: 1,
            isPublished: true,
            durationMinutes: 25,
          },
        ],
      },
    },
    include: { lessons: true },
  });

  const lessons = [...module1.lessons, ...module2.lessons].sort((a, b) => a.order - b.order);

  for (const [index, lesson] of lessons.entries()) {
    await prisma.quiz.create({
      data: {
        title: `${lesson.title} testi`,
        description: "Dars bo'yicha bilimlarni tekshirish testi.",
        courseId: course.id,
        lessonId: lesson.id,
        passingScore: 70,
        attemptLimit: 3,
        createdById: instructor.id,
        isFinal: false,
        questions: {
          create: [
            {
              text: "Darsning asosiy texnik mavzusi nimaga qaratilgan?",
              type: QuestionType.MULTIPLE_CHOICE,
              order: 1,
              options: {
                create: [
                  { text: "Robot komponentlari va ularning vazifalari", isCorrect: true, order: 1 },
                  { text: "Faqat nazariy tarixiy faktlar", isCorrect: false, order: 2 },
                  { text: "Mavzuga aloqasiz kontent", isCorrect: false, order: 3 },
                ],
              },
            },
            {
              text: "Qaysi amallar robot loyihasida muhim?",
              type: QuestionType.MULTIPLE_SELECT,
              order: 2,
              options: {
                create: [
                  { text: "Sensor ma'lumotini tekshirish", isCorrect: true, order: 1 },
                  { text: "Kodni test qilish", isCorrect: true, order: 2 },
                  { text: "Xatolarni e'tiborsiz qoldirish", isCorrect: false, order: 3 },
                ],
              },
            },
          ],
        },
      },
    });

    await prisma.lessonMaterial.create({
      data: {
        lessonId: lesson.id,
        fileName: `dars-${index + 1}-qoshimcha.pdf`,
        fileUrl: `/uploads/demo/dars-${index + 1}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 120000,
        type: MaterialType.PDF,
      },
    });
  }

  await prisma.quiz.create({
    data: {
      title: "Yakuniy test",
      description: "Kurs bo'yicha yakuniy baholash testi.",
      courseId: course.id,
      isFinal: true,
      passingScore: 75,
      attemptLimit: 2,
      createdById: instructor.id,
      questions: {
        create: [
          {
            text: "Kurs bo'yicha eng muhim amaliy natija qaysi?",
            type: QuestionType.MULTIPLE_CHOICE,
            order: 1,
            options: {
              create: [
                { text: "Ishlaydigan robot prototipini yaratish", isCorrect: true, order: 1 },
                { text: "Faqat terminlarni yodlash", isCorrect: false, order: 2 },
                { text: "Amaliy topshiriqni bajarmaslik", isCorrect: false, order: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: { status: EnrollmentStatus.ACTIVE },
    create: {
      userId: student.id,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  await prisma.lessonProgress.deleteMany({ where: { enrollmentId: enrollment.id } });
  for (const [index, lesson] of lessons.entries()) {
    await prisma.lessonProgress.create({
      data: {
        enrollmentId: enrollment.id,
        userId: student.id,
        lessonId: lesson.id,
        status: index === 0 ? ProgressStatus.UNLOCKED : ProgressStatus.LOCKED,
        unlockedAt: index === 0 ? new Date() : null,
      },
    });
  }

  console.log("Seed bajarildi.");
  console.log("Admin: admin@eduhistory.uz / Eduhistory2026!");
  console.log("Ustoz: ustoz@eduhistory.uz / Eduhistory2026!");
  console.log("Talaba: talaba@eduhistory.uz / Eduhistory2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
