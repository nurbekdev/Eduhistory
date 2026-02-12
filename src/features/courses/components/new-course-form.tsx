"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().min(3, "Kurs nomi kamida 3 ta belgi bo'lishi kerak"),
  slug: z
    .string()
    .min(3, "Slug kamida 3 ta belgi bo'lishi kerak")
    .regex(/^[a-z0-9-]+$/, "Slug faqat kichik harf, raqam va '-' bo'lishi kerak"),
  description: z.string().min(10, "Tavsif kamida 10 ta belgi bo'lishi kerak"),
  category: z.string().min(2, "Kategoriya kiriting"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  durationMinutes: z.number().int().min(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

type FormValues = z.infer<typeof schema>;

export function NewCourseForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category: "Tarix",
      level: "BEGINNER",
      durationMinutes: 120,
      status: "DRAFT",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Kurs yaratishda xatolik yuz berdi.");
      return;
    }

    const created = (await response.json()) as { id: string };
    toast.success("Kurs yaratildi.");
    router.push(`/boshqaruv/kurslar/${created.id}/tahrirlash`);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yangi kurs yaratish</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Kurs nomi</label>
            <Input {...form.register("title")} placeholder="Masalan: O'zbekiston tarixi asoslari" />
            <p className="text-xs text-red-600">{form.formState.errors.title?.message}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Slug</label>
            <Input {...form.register("slug")} placeholder="ozbekiston-tarixi-asoslari" />
            <p className="text-xs text-red-600">{form.formState.errors.slug?.message}</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Tavsif</label>
            <Textarea {...form.register("description")} />
            <p className="text-xs text-red-600">{form.formState.errors.description?.message}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Kategoriya</label>
            <Input {...form.register("category")} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Davomiylik (daq.)</label>
            <Input type="number" {...form.register("durationMinutes", { valueAsNumber: true })} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Daraja</label>
            <SelectNative {...form.register("level")}>
              <option value="BEGINNER">Boshlang'ich</option>
              <option value="INTERMEDIATE">O'rta</option>
              <option value="ADVANCED">Yuqori</option>
            </SelectNative>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <SelectNative {...form.register("status")}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Nashr qilingan</option>
              <option value="ARCHIVED">Arxiv</option>
            </SelectNative>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Yaratilmoqda..." : "Kurs yaratish"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
