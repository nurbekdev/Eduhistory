import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] overflow-x-hidden bg-gradient-to-br from-slate-50 via-emerald-50/60 to-teal-50/60 px-3 py-8 dark:from-slate-900 dark:via-emerald-950/40 dark:to-teal-950/40 sm:px-6 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-md">
        <div className="mb-5 text-center sm:mb-6">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Eduhistory</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Yangi hisob ochish</h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Talaba sifatida ro&apos;yxatdan o&apos;ting va kurslarni boshlang.</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
