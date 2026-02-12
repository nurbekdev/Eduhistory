"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  instructor: {
    id: string;
    fullName: string;
  };
  _count: {
    enrollments: number;
    modules: number;
  };
};

const levelMap: Record<CourseRow["level"], string> = {
  BEGINNER: "Boshlang'ich",
  INTERMEDIATE: "O'rta",
  ADVANCED: "Yuqori",
};

const statusMap: Record<CourseRow["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Nashr qilingan",
  ARCHIVED: "Arxiv",
};

async function getCourses(): Promise<CourseRow[]> {
  const response = await fetch("/api/courses");
  if (!response.ok) throw new Error("Kurslarni olishda xatolik yuz berdi.");
  return response.json();
}

export function ManageCoursesTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CourseRow["status"]>("ALL");

  const query = useQuery({
    queryKey: ["manage-courses"],
    queryFn: getCourses,
  });

  const rows = useMemo(() => {
    return (query.data ?? []).filter((course) => {
      const bySearch =
        !search ||
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.category.toLowerCase().includes(search.toLowerCase());
      const byStatus = statusFilter === "ALL" ? true : course.status === statusFilter;
      return bySearch && byStatus;
    });
  }, [query.data, search, statusFilter]);

  const onDeleteCourse = async (courseId: string) => {
    const confirmed = window.confirm("Kursni o'chirishni tasdiqlaysizmi?");
    if (!confirmed) return;
    const response = await fetch(`/api/courses/${courseId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Kursni o'chirishda xatolik yuz berdi.");
      return;
    }
    toast.success("Kurs o'chirildi.");
    await queryClient.invalidateQueries({ queryKey: ["manage-courses"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Kurslar jadvali</CardTitle>
        <Button asChild>
          <Link href="/boshqaruv/kurslar/yangi">+ Yangi kurs</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Input
            placeholder="Nom yoki kategoriya bo'yicha qidirish..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <SelectNative
            className="min-w-[220px]"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | CourseRow["status"])}
          >
            <option value="ALL">Barcha statuslar</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Nashr qilingan</option>
            <option value="ARCHIVED">Arxiv</option>
          </SelectNative>
        </div>

        {query.isLoading ? (
          <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">Kurslar topilmadi.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3">Kurs</th>
                  <th className="px-4 py-3">Kategoriya</th>
                  <th className="px-4 py-3">Daraja</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Talabalar</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 even:bg-slate-50/60 hover:bg-emerald-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.instructor.fullName}</p>
                    </td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">{levelMap[row.level]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "PUBLISHED" ? "default" : "warning"}>{statusMap[row.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">{row._count.enrollments}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/boshqaruv/kurslar/${row.id}/tahrirlash`}>Tahrirlash</Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDeleteCourse(row.id)}>
                          O'chirish
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
