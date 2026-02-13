"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const registerSchema = z
  .object({
    fullName: z.string().min(3, "F.I.SH kamida 3 ta belgidan iborat bo'lishi kerak"),
    email: z.string().email("Email noto'g'ri kiritilgan"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string().min(8, "Parol tasdig'i kamida 8 ta belgidan iborat bo'lishi kerak"),
    wantInstructor: z.boolean().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Parollar bir xil emas",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      wantInstructor: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        wantInstructor: !!values.wantInstructor,
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      toast.error(body.message ?? "Ro'yxatdan o'tishda xatolik yuz berdi.");
      return;
    }

    toast.success("Hisob yaratildi. Endi kirishingiz mumkin.");
    router.push("/kirish");
  });

  return (
    <Card className="mx-auto w-full max-w-md border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl backdrop-blur">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ro'yxatdan o'tish</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              F.I.SH
            </label>
            <Input id="fullName" placeholder="Ism Familiya Sharif" className="placeholder:text-slate-500 dark:placeholder:text-slate-400" {...form.register("fullName")} />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.fullName?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </label>
            <Input id="email" type="email" placeholder="siz@example.uz" className="placeholder:text-slate-500 dark:placeholder:text-slate-400" {...form.register("email")} />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Parol
            </label>
            <Input id="password" type="password" placeholder="********" className="placeholder:text-slate-500 dark:placeholder:text-slate-400" {...form.register("password")} />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.password?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Parol tasdig'i
            </label>
            <Input id="confirmPassword" type="password" placeholder="********" className="placeholder:text-slate-500 dark:placeholder:text-slate-400" {...form.register("confirmPassword")} />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.confirmPassword?.message}</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-3">
            <input
              type="checkbox"
              {...form.register("wantInstructor")}
              className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Ustoz bo'lishni xohlayman
            </span>
          </label>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Belgilang bo'lsa, admin tasdiqlagach hisobingiz ustoz sifatida faollashtiriladi.
          </p>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Yaratilmoqda..." : "Hisob yaratish"}
          </Button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Akkauntingiz bormi?{" "}
            <Link href="/kirish" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
              Kirish sahifasi
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
