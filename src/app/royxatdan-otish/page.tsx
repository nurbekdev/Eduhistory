import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-emerald-50/60 to-teal-50/60 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold text-emerald-600">Eduhistory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Yangi hisob ochish</h1>
          <p className="mt-2 text-sm text-slate-500">Talaba sifatida ro'yxatdan o'ting va kurslarni boshlang.</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
