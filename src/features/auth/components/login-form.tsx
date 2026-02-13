"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

    if (response?.error) {
      toast.error("Kirish amalga oshmadi. Ma'lumotlarni tekshiring.");
      return;
    }

    const nextPath =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    if (nextPath?.startsWith("/")) {
      toast.success("Muvaffaqiyatli kirdingiz.");
      router.push(nextPath);
      router.refresh();
      return;
    }

    const session = await getSession();
    toast.success("Muvaffaqiyatli kirdingiz.");
    router.push(getDefaultRouteByRole(session?.user?.role));
    router.refresh();
  });

  return (
    <Card className="mx-auto w-full max-w-md border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl backdrop-blur">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Xush kelibsiz</CardTitle>
      </CardHeader>
      <CardContent>
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
