"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Email noto'g'ri kiritilgan"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getDefaultRouteByRole(role: string | undefined) {
  if (role === "ADMIN" || role === "INSTRUCTOR") {
    return "/boshqaruv";
  }
  return "/dashboard";
}

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await signIn("credentials", {
      ...values,
      redirect: false,
    });

    // Muvaffaqiyat faqat ok: true va xato yo‘q bo‘lsa (noto‘g‘ri parol/email da NextAuth error qaytaradi)
    if (!response || response.error || response.ok === false) {
      toast.error("Kirish amalga oshmadi. Email yoki parol noto‘g‘ri.");
      return;
    }

    toast.success("Muvaffaqiyatli kirdingiz.");

    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    if (nextPath?.startsWith("/")) {
      window.location.href = nextPath;
      return;
    }

    // Kichik kutish: session cookie yozilishi uchun, keyin to‘liq sahifa yo‘naltirish (middleware cookie ko‘radi)
    await new Promise((r) => setTimeout(r, 100));
    const session = await getSession();
    const path = getDefaultRouteByRole(session?.user?.role) ?? "/dashboard";
    window.location.href = path;
  });

  return (
    <Card className="mx-auto w-full min-w-0 max-w-md border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl backdrop-blur">
      <CardHeader className="px-4 pb-3 pt-4 text-center sm:px-6">
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Xush kelibsiz</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="siz@example.uz"
              className="placeholder:text-slate-500 dark:placeholder:text-slate-400"
              {...form.register("email")}
            />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Parol
            </label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              className="placeholder:text-slate-500 dark:placeholder:text-slate-400"
              {...form.register("password")}
            />
            <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.password?.message}</p>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Kirilmoqda..." : "Kirish"}
          </Button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Hisobingiz yo'qmi?{" "}
            <Link href="/royxatdan-otish" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
              Ro'yxatdan o'ting
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
