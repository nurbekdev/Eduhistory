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
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
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
    <Card className="mx-auto w-full max-w-md border-slate-200 bg-white/95 shadow-xl backdrop-blur">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-2xl text-slate-900">Ro'yxatdan o'tish</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
              F.I.SH
            </label>
            <Input id="fullName" placeholder="Ism Familiya Sharif" {...form.register("fullName")} />
            <p className="text-xs text-red-600">{form.formState.errors.fullName?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <Input id="email" type="email" placeholder="siz@example.uz" {...form.register("email")} />
            <p className="text-xs text-red-600">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Parol
            </label>
            <Input id="password" type="password" placeholder="********" {...form.register("password")} />
            <p className="text-xs text-red-600">{form.formState.errors.password?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Parol tasdig'i
            </label>
            <Input id="confirmPassword" type="password" placeholder="********" {...form.register("confirmPassword")} />
            <p className="text-xs text-red-600">{form.formState.errors.confirmPassword?.message}</p>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Yaratilmoqda..." : "Hisob yaratish"}
          </Button>
          <p className="text-center text-sm text-slate-500">
            Akkauntingiz bormi?{" "}
            <Link href="/kirish" className="font-medium text-emerald-600 hover:text-emerald-700">
              Kirish sahifasi
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
