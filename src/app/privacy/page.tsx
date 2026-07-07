import type { Metadata } from "next";
import { CalendarDays, Database, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduhistory.uz";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "Eduhistory platformasida shaxsiy ma'lumotlar, kurs progressi, test natijalari va sertifikatlar qanday himoyalanishi haqida maxfiylik siyosati.",
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
  openGraph: {
    title: "Maxfiylik siyosati | Eduhistory",
    description: "Eduhistory foydalanuvchi ma'lumotlarini qanday yig'ishi, ishlatishi va himoya qilishi haqida.",
    url: `${siteUrl}/privacy`,
  },
};

const collectedData = [
  "Ro'yxatdan o'tish vaqtida kiritilgan ism, email, login ma'lumotlari va profil sozlamalari.",
  "Kurslarga yozilish, darslarni tugatish, test urinishlari, ballar, progress va sertifikat ma'lumotlari.",
  "Platformadan foydalanish xavfsizligi uchun texnik ma'lumotlar: sessiya cookie fayllari, qurilma turi, brauzer va IP manzil.",
  "Foydalanuvchi yuklagan avatar, kurs muqovalari, dars materiallari yoki boshqa ta'limga oid fayllar.",
];

const usageItems = [
  "hisobingizni yaratish va xavfsiz kirishni ta'minlash;",
  "kurslar, darslar, testlar, progress va sertifikatlarni ishlatish;",
  "o'qituvchi va administratorlarga ta'lim jarayonini boshqarish imkonini berish;",
  "texnik nosozliklarni aniqlash, xizmat sifatini yaxshilash va xavfsizlikni kuchaytirish;",
  "muhim tizim xabarnomalari, progress yoki sertifikat bo'yicha bildirishnomalarni yetkazish.",
];

export default function PrivacyPage() {
  return (
    <PageContainer className="pb-14 sm:pb-20">
      <section className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white px-5 py-8 shadow-xl dark:border-emerald-900 dark:bg-slate-800 sm:px-8 sm:py-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500" />
        <div className="max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="size-4" />
            Eduhistory xavfsizlik siyosati
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Maxfiylik siyosati
          </h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Eduhistory foydalanuvchilarining shaxsiy ma'lumotlarini hurmat qiladi. Ushbu sahifa platformada qaysi
            ma'lumotlar yig'ilishi, nima maqsadda ishlatilishi va qanday himoyalanishini tushuntiradi.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
              <CalendarDays className="size-4 text-emerald-600" />
              Oxirgi yangilangan: 2026-yil 7-iyul
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
              <LockKeyhole className="size-4 text-emerald-600" />
              Domen: eduhistory.uz
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Qisqa mazmun</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>Biz ma'lumotlarni faqat ta'lim platformasini ishlatish, xavfsizlik va xizmat sifatini oshirish uchun ishlatamiz.</p>
            <p>Eduhistory foydalanuvchi ma'lumotlarini sotmaydi va reklama tarmoqlariga uzatmaydi.</p>
            <p>Hisobingiz yoki ma'lumotlaringiz bo'yicha murojaat uchun: admin@eduhistory.uz</p>
          </div>
        </aside>

        <article className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Database className="size-5" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Yig'iladigan ma'lumotlar</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {collectedData.map((item) => (
                <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Ma'lumotlardan foydalanish</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Ma'lumotlar quyidagi maqsadlarda qayta ishlanadi:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {usageItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Cookie fayllar va sessiyalar</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Eduhistory hisobga kirish, sessiyani saqlash, til sozlamalari va xavfsizlikni ta'minlash uchun zarur
              cookie fayllardan foydalanadi. Ushbu cookie fayllar platformaning asosiy funksiyalari uchun kerak.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Ma'lumotlarni ulashish</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Biz shaxsiy ma'lumotlarni sotmaymiz. Ma'lumotlar faqat qonuniy talablar, platformani texnik qo'llab-quvvatlash,
              xavfsizlik yoki foydalanuvchi ruxsat bergan holatlarda kerakli xizmat provayderlari bilan cheklangan tartibda
              ishlanishi mumkin.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Saqlash va himoya qilish</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Ma'lumotlar ruxsatsiz kirish, o'zgartirish yoki yo'qotilishdan himoya qilish uchun texnik va tashkiliy
              choralar bilan saqlanadi. Hisob parollari xavfsiz xeshlangan holda saqlanadi, sessiyalar esa himoyalangan
              autentifikatsiya mexanizmlari orqali boshqariladi.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Foydalanuvchi huquqlari</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Siz hisobingizdagi ma'lumotlarni yangilash, noto'g'ri ma'lumotlarni tuzatish yoki hisobingizni o'chirish
              bo'yicha murojaat qilishingiz mumkin. Ta'lim jarayoniga bog'liq progress, test va sertifikat yozuvlari
              qonuniy, xavfsizlik yoki akademik hisobot talablari sababli cheklangan muddat saqlanishi mumkin.
            </p>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-md dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
                <Mail className="size-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Aloqa</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Maxfiylik bo'yicha savollar uchun: admin@eduhistory.uz
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </PageContainer>
  );
}
