import { cookies } from "next/headers";

import { LoginForm } from "@/features/auth/components/login-form";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("eduhistory-locale")?.value as Locale) ?? "uz";
  const t = getT(locale);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-emerald-50/60 to-teal-50/60 px-4 py-10 sm:px-6 dark:from-slate-900 dark:via-emerald-950/40 dark:to-teal-950/40">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Eduhistory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("login.title")}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
