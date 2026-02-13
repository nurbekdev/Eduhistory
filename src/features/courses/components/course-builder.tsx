"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LessonQuizBuilder } from "@/features/courses/components/lesson-quiz-builder";

type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImageUrl: string | null;
  durationMinutes: number;
  defaultPassingScore: number;
  defaultAttemptLimit: number;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string;
      content: string | null;
      youtubeUrl: string;
      videoFileUrl: string | null;
      durationMinutes: number;
      order: number;
      isPublished: boolean;
      materials: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
        mimeType: string;
      }>;
      quiz: {
        id: string;
        title: string;
        description: string | null;
        passingScore: number;
        attemptLimit: number;
        timeLimitMinutes?: number | null;
        questions: Array<{
          id: string;
          text: string;
          explanation: string | null;
          type: string;
          metadata?: unknown;
          options: Array<{
            id: string;
            text: string;
            isCorrect: boolean;
          }>;
        }>;
      } | null;
    }>;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    attemptLimit: number;
    timeLimitMinutes?: number | null;
    questions: Array<{
      id: string;
      text: string;
      explanation: string | null;
      type: string;
      metadata?: unknown;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
      }>;
    }>;
  }>;
  _count: {
    enrollments: number;
  };
};

type CourseBuilderProps = {
  courseId: string;
};

type LessonDraft = {
  title: string;
  description: string;
  youtubeUrl: string;
  content: string;
  durationMinutes: number;
};

const emptyLessonDraft: LessonDraft = {
  title: "",
  description: "",
  youtubeUrl: "",
  content: "",
  durationMinutes: 15,
};

async function getCourse(courseId: string): Promise<CourseDetail> {
  const response = await fetch(`/api/courses/${courseId}`);
  if (!response.ok) throw new Error("Kurs ma'lumotlarini olishda xatolik yuz berdi.");
  return response.json();
}

export function CourseBuilder({ courseId }: CourseBuilderProps) {
  const queryClient = useQueryClient();
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({});
  const [draftPdfFiles, setDraftPdfFiles] = useState<Record<string, File[]>>({});
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [fetchingDurationFor, setFetchingDurationFor] = useState<string | null>(null);

  const fetchYoutubeDuration = async (url: string): Promise<number | null> => {
    if (!url?.trim()) return null;
    const res = await fetch(`/api/youtube/duration?url=${encodeURIComponent(url.trim())}`);
    const data = (await res.json()) as { durationMinutes?: number | null; error?: string };
    if (data.durationMinutes != null && data.durationMinutes >= 0) return data.durationMinutes;
    if (data.error) toast.error(data.error);
    return null;
  };

  const query = useQuery({
    queryKey: ["course-builder", courseId],
    queryFn: () => getCourse(courseId),
  });

  const course = query.data;

  const toggleModule = (moduleId: string) => {
    setExpandedModuleIds((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
  };

  const draftForModule = (moduleId: string): LessonDraft => lessonDrafts[moduleId] ?? emptyLessonDraft;

  const setDraftForModule = (moduleId: string, payload: Partial<LessonDraft>) => {
    setLessonDrafts((prev) => ({
      ...prev,
      [moduleId]: { ...draftForModule(moduleId), ...payload },
    }));
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["course-builder", courseId] });
  };

  const updateCourse = async () => {
    if (!course) return;
    const response = await fetch(`/api/courses/${course.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: course.title,
        slug: course.slug,
        description: course.description,
        category: course.category,
        level: course.level,
        status: course.status,
        coverImageUrl: course.coverImageUrl ?? "",
        durationMinutes: Number(course.durationMinutes),
        defaultPassingScore: Number(course.defaultPassingScore),
        defaultAttemptLimit: Number(course.defaultAttemptLimit),
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Kursni saqlashda xatolik yuz berdi.");
      return;
    }

    toast.success("Kurs ma'lumotlari saqlandi.");
    await refresh();
  };

  const createModule = async () => {
    if (!newModuleTitle.trim()) return;
    const response = await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newModuleTitle,
        description: newModuleDescription,
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Modul qo'shishda xatolik yuz berdi.");
      return;
    }
    toast.success("Modul qo'shildi.");
    setNewModuleTitle("");
    setNewModuleDescription("");
    await refresh();
  };

  const updateModule = async (moduleId: string, payload: { title: string; description: string | null; order: number }) => {
    const response = await fetch(`/api/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Modulni saqlashda xatolik yuz berdi.");
      return;
    }
    toast.success("Modul saqlandi.");
    await refresh();
  };

  const deleteModule = async (moduleId: string) => {
    if (!window.confirm("Modulni o'chirishni tasdiqlaysizmi?")) return;
    const response = await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Modulni o'chirishda xatolik yuz berdi.");
      return;
    }
    toast.success("Modul o'chirildi.");
    await refresh();
  };

  const createLesson = async (moduleId: string) => {
    const draft = draftForModule(moduleId);
    if (!draft.title.trim() || !draft.description.trim()) {
      toast.error("Dars nomi va tavsifini kiriting.");
      return;
    }
    const response = await fetch(`/api/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Dars qo'shishda xatolik yuz berdi.");
      return;
    }
    const lesson = (await response.json()) as { id: string };
    const pendingPdfs = draftPdfFiles[moduleId] ?? [];
    for (const file of pendingPdfs) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "lesson-materials");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) continue;
      const uploaded = (await uploadRes.json()) as { fileUrl: string };
      await fetch(`/api/lessons/${lesson.id}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: uploaded.fileUrl,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
    }
    setDraftPdfFiles((prev) => ({ ...prev, [moduleId]: [] }));
    setLessonDrafts((prev) => ({ ...prev, [moduleId]: { ...emptyLessonDraft } }));
    toast.success("Dars va default test yaratildi.");
    await refresh();
  };

  const updateLesson = async (
    lessonId: string,
    payload: {
      title: string;
      description: string;
      content: string | null;
      youtubeUrl: string;
      durationMinutes: number;
      isPublished: boolean;
      order: number;
      videoFileUrl: string | null;
    },
  ) => {
    const body = {
      title: payload.title.trim(),
      description: payload.description.trim(),
      content: payload.content ?? undefined,
      youtubeUrl: payload.youtubeUrl ?? "",
      durationMinutes: Number(payload.durationMinutes) || 0,
      isPublished: Boolean(payload.isPublished),
      order: Number(payload.order) || 1,
      videoFileUrl: payload.videoFileUrl && payload.videoFileUrl !== "" ? payload.videoFileUrl : "",
    };
    const response = await fetch(`/api/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Darsni saqlashda xatolik yuz berdi.");
      return;
    }
    toast.success("Dars saqlandi.");
    await refresh();
  };

  const deleteLesson = async (lessonId: string) => {
    if (!window.confirm("Darsni o'chirishni tasdiqlaysizmi?")) return;
    const response = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Darsni o'chirishda xatolik yuz berdi.");
      return;
    }
    toast.success("Dars o'chirildi.");
    await refresh();
  };

  const totalLessons = course?.modules.reduce((acc, moduleItem) => acc + moduleItem.lessons.length, 0) ?? 0;
  const finalQuiz = course?.quizzes[0] ?? null;

  if (query.isLoading || !course) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-zinc-600">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Kurs sozlamalari</CardTitle>
          <Badge>{course._count.enrollments} ta talaba</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Kurs nomi</label>
            <Input
              value={course.title}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, title: event.target.value } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={course.slug}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, slug: event.target.value } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Kategoriya</label>
            <Input
              value={course.category}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, category: event.target.value } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Tavsif</label>
            <Textarea
              value={course.description}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, description: event.target.value } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Cover rasm (URL yoki yuklash)</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="https://... yoki /uploads/..."
                className="min-w-[200px] flex-1"
                value={course.coverImageUrl ?? ""}
                onChange={(event) =>
                  queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                    prev ? { ...prev, coverImageUrl: event.target.value } : prev,
                  )
                }
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                <Upload className="size-4" />
                Fayl yuklash
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !course) return;
                    const formData = new FormData();
                    formData.set("file", file);
                    formData.set("folder", "covers");
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    if (!res.ok) {
                      const body = (await res.json()) as { message?: string };
                      toast.error(body.message ?? "Yuklashda xatolik.");
                      return;
                    }
                    const data = (await res.json()) as { fileUrl: string };
                    queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                      prev ? { ...prev, coverImageUrl: data.fileUrl } : prev,
                    );
                    toast.success("Cover yuklandi.");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Davomiylik (daq.)</label>
            <Input
              type="number"
              value={course.durationMinutes}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, durationMinutes: Number(event.target.value) } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Default passing (%)</label>
            <Input
              type="number"
              value={course.defaultPassingScore}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, defaultPassingScore: Number(event.target.value) } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Default urinish limiti</label>
            <Input
              type="number"
              value={course.defaultAttemptLimit}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev ? { ...prev, defaultAttemptLimit: Number(event.target.value) } : prev,
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Daraja</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              value={course.level}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev
                    ? {
                        ...prev,
                        level: event.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                      }
                    : prev,
                )
              }
            >
              <option value="BEGINNER">Boshlang'ich</option>
              <option value="INTERMEDIATE">O'rta</option>
              <option value="ADVANCED">Yuqori</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              value={course.status}
              onChange={(event) =>
                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                  prev
                    ? {
                        ...prev,
                        status: event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED",
                      }
                    : prev,
                )
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Nashr qilingan</option>
              <option value="ARCHIVED">Arxiv</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Jami: {course.modules.length} ta modul, {totalLessons} ta dars
            </p>
            <Button onClick={updateCourse}>Kurs ma'lumotlarini saqlash</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yangi modul qo'shish</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Modul nomi" value={newModuleTitle} onChange={(event) => setNewModuleTitle(event.target.value)} />
          <Input
            placeholder="Modul tavsifi"
            value={newModuleDescription}
            onChange={(event) => setNewModuleDescription(event.target.value)}
          />
          <Button onClick={createModule}>Qo'shish</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {course.modules.map((moduleItem) => (
          <Card key={moduleItem.id}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Modul #{moduleItem.order}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleModule(moduleItem.id)}>
                    {expandedModuleIds.includes(moduleItem.id) ? "Yopish" : "Ochish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteModule(moduleItem.id)}>
                    O'chirish
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_100px_auto]">
                <Input
                  value={moduleItem.title}
                  onChange={(event) =>
                    queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                      prev
                        ? {
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === moduleItem.id ? { ...item, title: event.target.value } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                />
                <Input
                  value={moduleItem.description ?? ""}
                  onChange={(event) =>
                    queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                      prev
                        ? {
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === moduleItem.id ? { ...item, description: event.target.value } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                />
                <Input
                  type="number"
                  value={moduleItem.order}
                  onChange={(event) =>
                    queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                      prev
                        ? {
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === moduleItem.id ? { ...item, order: Number(event.target.value) } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                />
                <Button
                  onClick={() =>
                    updateModule(moduleItem.id, {
                      title: moduleItem.title,
                      description: moduleItem.description,
                      order: moduleItem.order,
                    })
                  }
                >
                  Saqlash
                </Button>
              </div>
            </CardHeader>

            {expandedModuleIds.includes(moduleItem.id) ? (
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-3">
                  <p className="mb-2 text-sm font-medium">Yangi dars qo'shish</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Dars nomi"
                      value={draftForModule(moduleItem.id).title}
                      onChange={(event) => setDraftForModule(moduleItem.id, { title: event.target.value })}
                    />
                    <Input
                      placeholder="YouTube link (ixtiyoriy, bo'sh qoldirish mumkin)"
                      value={draftForModule(moduleItem.id).youtubeUrl}
                      onChange={(event) => setDraftForModule(moduleItem.id, { youtubeUrl: event.target.value })}
                      onBlur={async () => {
                        const url = draftForModule(moduleItem.id).youtubeUrl;
                        if (!url?.trim()) return;
                        const key = `draft-${moduleItem.id}`;
                        setFetchingDurationFor(key);
                        const min = await fetchYoutubeDuration(url);
                        setFetchingDurationFor(null);
                        if (min != null) {
                          setDraftForModule(moduleItem.id, { durationMinutes: min });
                          toast.success(`Davomiylik: ${min} daqiqa`);
                        }
                      }}
                    />
                    <Input
                      placeholder="Qisqa tavsif"
                      value={draftForModule(moduleItem.id).description}
                      onChange={(event) => setDraftForModule(moduleItem.id, { description: event.target.value })}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Davomiylik (daq)"
                        className="w-24"
                        value={draftForModule(moduleItem.id).durationMinutes}
                        onChange={(event) =>
                          setDraftForModule(moduleItem.id, { durationMinutes: Number(event.target.value) || 0 })
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!draftForModule(moduleItem.id).youtubeUrl?.trim() || fetchingDurationFor === `draft-${moduleItem.id}`}
                        onClick={async () => {
                          const url = draftForModule(moduleItem.id).youtubeUrl;
                          if (!url?.trim()) return;
                          const key = `draft-${moduleItem.id}`;
                          setFetchingDurationFor(key);
                          const min = await fetchYoutubeDuration(url);
                          setFetchingDurationFor(null);
                          if (min != null) {
                            setDraftForModule(moduleItem.id, { durationMinutes: min });
                            toast.success(`Davomiylik: ${min} daqiqa`);
                          }
                        }}
                      >
                        {fetchingDurationFor === `draft-${moduleItem.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Videodan olish"
                        )}
                      </Button>
                    </div>
                    <div className="md:col-span-2">
                      <RichTextEditor
                        placeholder="Dars matni (qisqa tavsif, qo'llanma va h.k.)"
                        value={draftForModule(moduleItem.id).content}
                        onChange={(html) => setDraftForModule(moduleItem.id, { content: html })}
                        minHeight="200px"
                        onImageUpload={async (file) => {
                          const formData = new FormData();
                          formData.set("file", file);
                          formData.set("folder", "lesson-content");
                          const res = await fetch("/api/upload", { method: "POST", body: formData });
                          if (!res.ok) throw new Error("Yuklashda xatolik");
                          const data = (await res.json()) as { fileUrl: string };
                          return data.fileUrl.startsWith("http") ? data.fileUrl : `${typeof window !== "undefined" ? window.location.origin : ""}${data.fileUrl}`;
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-sm font-medium">PDF / materiallar (ixtiyoriy)</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                          <FileText className="size-4" />
                          PDF qo'shish
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (!files.length) return;
                              setDraftPdfFiles((prev) => ({
                                ...prev,
                                [moduleItem.id]: [...(prev[moduleItem.id] ?? []), ...files],
                              }));
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {(draftPdfFiles[moduleItem.id] ?? []).map((f, i) => (
                          <Badge key={i} variant="warning" className="gap-1">
                            {f.name}
                            <button
                              type="button"
                              onClick={() =>
                                setDraftPdfFiles((prev) => ({
                                  ...prev,
                                  [moduleItem.id]: (prev[moduleItem.id] ?? []).filter((_, j) => j !== i),
                                }))
                              }
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={() => createLesson(moduleItem.id)}>Dars qo'shish</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {moduleItem.lessons.length === 0 ? (
                    <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">Bu modulda hali dars yo'q.</div>
                  ) : (
                    moduleItem.lessons.map((lesson) => (
                      <div key={lesson.id} className="space-y-3 rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Dars #{lesson.order}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={lesson.isPublished ? "default" : "warning"}>
                              {lesson.isPublished ? "Published" : "Draft"}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => deleteLesson(lesson.id)}>
                              O'chirish
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input
                            value={lesson.title}
                            onChange={(event) =>
                              queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      modules: prev.modules.map((moduleMap) =>
                                        moduleMap.id === moduleItem.id
                                          ? {
                                              ...moduleMap,
                                              lessons: moduleMap.lessons.map((lessonMap) =>
                                                lessonMap.id === lesson.id ? { ...lessonMap, title: event.target.value } : lessonMap,
                                              ),
                                            }
                                          : moduleMap,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                          <Input
                            value={lesson.youtubeUrl}
                            onChange={(event) =>
                              queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      modules: prev.modules.map((moduleMap) =>
                                        moduleMap.id === moduleItem.id
                                          ? {
                                              ...moduleMap,
                                              lessons: moduleMap.lessons.map((lessonMap) =>
                                                lessonMap.id === lesson.id
                                                  ? { ...lessonMap, youtubeUrl: event.target.value }
                                                  : lessonMap,
                                              ),
                                            }
                                          : moduleMap,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                            onBlur={async () => {
                              if (!lesson.youtubeUrl?.trim()) return;
                              const key = `lesson-${lesson.id}`;
                              setFetchingDurationFor(key);
                              const min = await fetchYoutubeDuration(lesson.youtubeUrl);
                              setFetchingDurationFor(null);
                              if (min != null) {
                                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        modules: prev.modules.map((moduleMap) =>
                                          moduleMap.id === moduleItem.id
                                            ? {
                                                ...moduleMap,
                                                lessons: moduleMap.lessons.map((lessonMap) =>
                                                  lessonMap.id === lesson.id
                                                    ? { ...lessonMap, durationMinutes: min }
                                                    : lessonMap,
                                                ),
                                              }
                                            : moduleMap,
                                        ),
                                      }
                                    : prev,
                                );
                                toast.success(`Davomiylik: ${min} daqiqa`);
                              }
                            }}
                          />
                          <Input
                            value={lesson.description}
                            onChange={(event) =>
                              queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      modules: prev.modules.map((moduleMap) =>
                                        moduleMap.id === moduleItem.id
                                          ? {
                                              ...moduleMap,
                                              lessons: moduleMap.lessons.map((lessonMap) =>
                                                lessonMap.id === lesson.id
                                                  ? { ...lessonMap, description: event.target.value }
                                                  : lessonMap,
                                              ),
                                            }
                                          : moduleMap,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min={0}
                              className="w-24"
                              value={lesson.durationMinutes}
                              onChange={(event) =>
                                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        modules: prev.modules.map((moduleMap) =>
                                          moduleMap.id === moduleItem.id
                                            ? {
                                                ...moduleMap,
                                                lessons: moduleMap.lessons.map((lessonMap) =>
                                                  lessonMap.id === lesson.id
                                                    ? {
                                                        ...lessonMap,
                                                        durationMinutes: Number(event.target.value) || 0,
                                                      }
                                                    : lessonMap,
                                                ),
                                              }
                                            : moduleMap,
                                        ),
                                      }
                                    : prev,
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!lesson.youtubeUrl?.trim() || fetchingDurationFor === `lesson-${lesson.id}`}
                              onClick={async () => {
                                if (!lesson.youtubeUrl?.trim()) return;
                                const key = `lesson-${lesson.id}`;
                                setFetchingDurationFor(key);
                                const min = await fetchYoutubeDuration(lesson.youtubeUrl);
                                setFetchingDurationFor(null);
                                if (min != null) {
                                  queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          modules: prev.modules.map((moduleMap) =>
                                            moduleMap.id === moduleItem.id
                                              ? {
                                                  ...moduleMap,
                                                  lessons: moduleMap.lessons.map((lessonMap) =>
                                                    lessonMap.id === lesson.id
                                                      ? { ...lessonMap, durationMinutes: min }
                                                      : lessonMap,
                                                  ),
                                                }
                                              : moduleMap,
                                          ),
                                        }
                                      : prev,
                                  );
                                  toast.success(`Davomiylik: ${min} daqiqa`);
                                }
                              }}
                            >
                              {fetchingDurationFor === `lesson-${lesson.id}` ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Videodan olish"
                              )}
                            </Button>
                          </div>
                          <div className="md:col-span-2">
                            <RichTextEditor
                              value={lesson.content ?? ""}
                              onChange={(html) =>
                                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        modules: prev.modules.map((moduleMap) =>
                                          moduleMap.id === moduleItem.id
                                            ? {
                                                ...moduleMap,
                                                lessons: moduleMap.lessons.map((lessonMap) =>
                                                  lessonMap.id === lesson.id ? { ...lessonMap, content: html } : lessonMap,
                                                ),
                                              }
                                            : moduleMap,
                                        ),
                                      }
                                    : prev,
                                )
                              }
                              placeholder="Dars matni"
                              minHeight="200px"
                              onImageUpload={async (file) => {
                                const formData = new FormData();
                                formData.set("file", file);
                                formData.set("folder", "lesson-content");
                                const res = await fetch("/api/upload", { method: "POST", body: formData });
                                if (!res.ok) throw new Error("Yuklashda xatolik");
                                const data = (await res.json()) as { fileUrl: string };
                                return data.fileUrl.startsWith("http") ? data.fileUrl : `${typeof window !== "undefined" ? window.location.origin : ""}${data.fileUrl}`;
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`isPublished-${lesson.id}`}
                              type="checkbox"
                              checked={lesson.isPublished}
                              onChange={(event) =>
                                queryClient.setQueryData<CourseDetail>(["course-builder", courseId], (prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        modules: prev.modules.map((moduleMap) =>
                                          moduleMap.id === moduleItem.id
                                            ? {
                                                ...moduleMap,
                                                lessons: moduleMap.lessons.map((lessonMap) =>
                                                  lessonMap.id === lesson.id
                                                    ? { ...lessonMap, isPublished: event.target.checked }
                                                    : lessonMap,
                                                ),
                                              }
                                            : moduleMap,
                                        ),
                                      }
                                    : prev,
                                )
                              }
                            />
                            <label htmlFor={`isPublished-${lesson.id}`} className="text-sm">
                              Darsni nashr qilish
                            </label>
                          </div>
                          <Button
                            className="w-fit"
                            onClick={() =>
                              updateLesson(lesson.id, {
                                title: lesson.title,
                                description: lesson.description,
                                content: lesson.content,
                                youtubeUrl: lesson.youtubeUrl,
                                durationMinutes: lesson.durationMinutes,
                                isPublished: lesson.isPublished,
                                order: lesson.order,
                                videoFileUrl: lesson.videoFileUrl,
                              })
                            }
                          >
                            Darsni saqlash
                          </Button>

                          <div className="mt-3 space-y-2 border-t pt-3 md:col-span-2">
                            <p className="text-sm font-medium">Materiallar (PDF va b.)</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {(lesson.materials ?? []).map((mat) => (
                                <Badge key={mat.id} variant="default" className="gap-1 pr-1">
                                  <FileText className="size-3.5" />
                                  {mat.fileName}
                                  <button
                                    type="button"
                                    className="rounded hover:bg-white/20"
                                    onClick={async () => {
                                      if (!window.confirm(`"${mat.fileName}" ni o'chirishni xohlaysizmi?`)) return;
                                      const res = await fetch(
                                        `/api/lessons/${lesson.id}/materials/${mat.id}`,
                                        { method: "DELETE" },
                                      );
                                      if (res.ok) await refresh();
                                      else toast.error("Material o'chirishda xatolik.");
                                    }}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              ))}
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100">
                                <Upload className="size-3.5" />
                                PDF qo'shish
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.set("file", file);
                                    formData.set("folder", "lesson-materials");
                                    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                                    if (!uploadRes.ok) {
                                      toast.error("Yuklashda xatolik.");
                                      return;
                                    }
                                    const uploaded = (await uploadRes.json()) as { fileUrl: string };
                                    const matRes = await fetch(`/api/lessons/${lesson.id}/materials`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        fileUrl: uploaded.fileUrl,
                                        fileName: file.name,
                                        mimeType: file.type,
                                        sizeBytes: file.size,
                                      }),
                                    });
                                    if (matRes.ok) {
                                      toast.success("Material qo'shildi.");
                                      await refresh();
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <LessonQuizBuilder
                          saveUrl={`/api/lessons/${lesson.id}/quiz`}
                          defaultQuizTitle={`${lesson.title} testi`}
                          panelTitle="Dars testi builder"
                          initialQuiz={lesson.quiz}
                          onSaved={refresh}
                        />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <LessonQuizBuilder
        saveUrl={`/api/courses/${course.id}/final-quiz`}
        defaultQuizTitle="Yakuniy test"
        panelTitle="Kurs yakuniy testi builder"
        initialQuiz={finalQuiz}
        onSaved={refresh}
      />
    </div>
  );
}
