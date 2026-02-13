"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpenCheck, GraduationCap, LineChart as LineChartIcon, Medal, MessageSquare, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CourseMetric = {
  id: string;
  title: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  enrolledCount: number;
  totalLessons: number;
  totalQuizzes: number;
  completionRate: number;
  averageQuizScore: number;
  finalPassRate: number;
  averageRating: number | null;
  reviewCount: number;
};

type AnalyticsResponse = {
  courses: CourseMetric[];
  selectedCourseId: string | null;
    selectedCourse: {
      id: string;
      title: string;
      category: string;
      lessonDropOff: Array<{
        lessonId: string;
        lessonTitle: string;
        moduleTitle: string;
        order: number;
        started: number;
        completed: number;
        dropOffRate: number;
      }>;
      studentsTable: Array<{
        userId: string;
        fullName: string;
        email: string;
        status: string;
        progressPercent: number;
        attemptsCount: number;
        averageScore: number;
        currentLessonTitle: string;
      }>;
      attemptsTrend: Array<{
        date: string;
        attempts: number;
        averageScore: number;
      }>;
      weeklyCohortComparison: {
        lessons: Array<{ lessonId: string; lessonTitle: string }>;
        rows: Array<{ week: string } & Record<string, number | string>>;
      };
      averageRating: number | null;
      totalReviews: number;
      recentReviews: Array<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        userName: string;
      }>;
      insights: string[];
    } | null;
};

async function fetchAnalytics(selectedCourseId: string | null): Promise<AnalyticsResponse> {
  const url = selectedCourseId ? `/api/analytics/instructor?courseId=${selectedCourseId}` : "/api/analytics/instructor";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Analitika ma'lumotlarini olishda xatolik yuz berdi.");
  }
  return response.json();
}

export function InstructorAnalyticsDashboard() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["instructor-analytics", selectedCourseId],
    queryFn: () => fetchAnalytics(selectedCourseId),
  });

  const data = query.data;

  const selectedCourseMetric = useMemo(
    () => data?.courses.find((course) => course.id === data.selectedCourseId) ?? null,
    [data],
  );

  const completionPie = useMemo(() => {
    if (!selectedCourseMetric) return [];
    return [
      { name: "Yakunlaganlar", value: selectedCourseMetric.completionRate },
      { name: "Jarayonda", value: Math.max(0, 100 - selectedCourseMetric.completionRate) },
    ];
  }, [selectedCourseMetric]);

  const lessonColors = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

  if (query.isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Analitika yuklanmoqda...</div>;
  }

  if (query.isError || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-red-600">
        Analitikani yuklashda xatolik yuz berdi.
      </div>
    );
  }

  if (!data.selectedCourse || !selectedCourseMetric) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Analitika uchun kurs topilmadi.</div>;
  }
  const selectedCourse = data.selectedCourse;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Kurs tanlash</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="h-10 min-w-72 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              value={data.selectedCourseId ?? ""}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              {data.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <Button asChild variant="outline">
              <a href={`/api/analytics/course/${data.selectedCourseId}/export`} target="_blank" rel="noreferrer">
                CSV eksport
              </a>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Users className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Talabalar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">{selectedCourseMetric.enrolledCount}</CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <BookOpenCheck className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Completion</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">{selectedCourseMetric.completionRate}%</CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <LineChartIcon className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Quiz o'rtacha ball</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">{selectedCourseMetric.averageQuizScore}%</CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Medal className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Final pass rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">{selectedCourseMetric.finalPassRate}%</CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <GraduationCap className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Dars / quiz</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">
            {selectedCourseMetric.totalLessons}/{selectedCourseMetric.totalQuizzes}
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <Star className="size-4" />
            </div>
            <CardTitle className="text-sm text-slate-500 dark:text-slate-400">Reyting</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold dark:text-slate-100">
            {selectedCourseMetric.averageRating != null
              ? `${selectedCourseMetric.averageRating.toFixed(1)} (${selectedCourseMetric.reviewCount})`
              : "—"}
          </CardContent>
        </Card>
      </div>

      {selectedCourse.insights && selectedCourse.insights.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <MessageSquare className="size-5" />
              Xulosalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-amber-900 dark:text-amber-100">
              {selectedCourse.insights.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(selectedCourse.totalReviews > 0 || selectedCourse.recentReviews.length > 0) && (
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-100">
              <Star className="size-5" />
              Kurs reytingi va talabalar fikrlari
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              O'rtacha {selectedCourse.averageRating?.toFixed(1) ?? "—"} yulduz, {selectedCourse.totalReviews} ta baho
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCourse.recentReviews.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Hozircha izohlar yo'q.</p>
            ) : (
              selectedCourse.recentReviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{r.userName}</span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      {r.rating} <Star className="size-4 fill-current" />
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lesson drop-off</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedCourse.lessonDropOff}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lessonTitle" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="started" fill="#14b8a6" name="Boshlagan" />
                  <Bar dataKey="completed" fill="#22c55e" name="Yakunlagan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion taqsimoti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={completionPie} dataKey="value" nameKey="name" outerRadius={100} fill="#059669" label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Urinishlar trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedCourse.attemptsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attempts" name="Urinishlar soni" stroke="#0ea5e9" />
                <Line type="monotone" dataKey="averageScore" name="O'rtacha ball" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Haftalik cohort comparison (lesson-level)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedCourse.weeklyCohortComparison.rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedCourse.weeklyCohortComparison.lessons.map((lesson, index) => (
                  <Line
                    key={lesson.lessonId}
                    type="monotone"
                    dataKey={lesson.lessonId}
                    name={lesson.lessonTitle}
                    stroke={lessonColors[index % lessonColors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3">Hafta</th>
                  {selectedCourse.weeklyCohortComparison.lessons.map((lesson) => (
                    <th key={lesson.lessonId} className="px-4 py-3">
                      {lesson.lessonTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedCourse.weeklyCohortComparison.rows.map((row) => (
                  <tr key={String(row.week)} className="border-t border-slate-200 even:bg-slate-50/60 hover:bg-emerald-50/60">
                    <td className="px-4 py-3">{String(row.week)}</td>
                    {selectedCourse.weeklyCohortComparison.lessons.map((lesson) => (
                      <td key={`${row.week}-${lesson.lessonId}`} className="px-4 py-3">
                        {Number(row[lesson.lessonId] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talabalar jadvali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3">Talaba</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Current lesson</th>
                  <th className="px-4 py-3">Urinishlar</th>
                  <th className="px-4 py-3">O'rtacha ball</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {selectedCourse.studentsTable.map((student) => (
                  <tr key={student.userId} className="border-t border-slate-200 even:bg-slate-50/60 hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full bg-emerald-500" style={{ width: `${student.progressPercent}%` }} />
                      </div>
                      <p className="mt-1 text-xs">{student.progressPercent}%</p>
                    </td>
                    <td className="px-4 py-3">{student.currentLessonTitle}</td>
                    <td className="px-4 py-3">{student.attemptsCount}</td>
                    <td className="px-4 py-3">{student.averageScore}%</td>
                    <td className="px-4 py-3">
                      <Badge variant={student.status === "COMPLETED" ? "default" : "warning"}>{student.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
