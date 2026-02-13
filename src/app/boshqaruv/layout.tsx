import Link from "next/link";
import { BarChart3, BookOpen, LayoutGrid, Settings2, UserPlus, Users, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const baseLinks = [
  { href: "/boshqaruv", label: "Umumiy panel", icon: LayoutGrid, adminOnly: false },
  { href: "/boshqaruv/kurslar", label: "Kurslar", icon: BookOpen, adminOnly: false },
  { href: "/boshqaruv/analitika", label: "Analitika", icon: BarChart3, adminOnly: false },
  { href: "/boshqaruv/talabalar", label: "Talabalar", icon: Users, adminOnly: false },
  { href: "/boshqaruv/foydalanuvchilar", label: "Foydalanuvchilar", icon: UserCog, adminOnly: true },
  { href: "/boshqaruv/ustoz-sorovlari", label: "Ustoz so'rovlari", icon: UserPlus, adminOnly: true },
  { href: "/boshqaruv/sertifikat-sozlamalari", label: "Sertifikat", icon: Settings2, adminOnly: false },
];

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === Role.ADMIN;
  const links = baseLinks.filter((l) => !l.adminOnly || isAdmin);

  let pendingInstructorCount = 0;
  if (isAdmin) {
    pendingInstructorCount = await prisma.instructorRequest.count({ where: { status: "PENDING" } });
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6">
      <aside className="hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm md:block">
        <div className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Boshqaruv paneli</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Eduhistory Admin/Ustoz</p>
        </div>
        <nav className="space-y-1">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
            >
              <item.icon className="size-4" />
              {item.label}
              {item.href === "/boshqaruv/ustoz-sorovlari" && pendingInstructorCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
                  {pendingInstructorCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="md:hidden">
        <details className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Admin menyu</span>
              <Badge variant="locked">Ochish</Badge>
            </div>
          </summary>
          <nav className="mt-3 grid gap-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <item.icon className="size-4" />
                {item.label}
                {item.href === "/boshqaruv/ustoz-sorovlari" && pendingInstructorCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">{pendingInstructorCount}</span>
                )}
              </Link>
            ))}
          </nav>
        </details>
      </div>

      <main className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 shadow-sm">
        {children}
      </main>
    </div>
  );
}
