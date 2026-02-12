import Link from "next/link";
import { BarChart3, BookOpen, LayoutGrid, Settings2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/boshqaruv", label: "Umumiy panel", icon: LayoutGrid },
  { href: "/boshqaruv/kurslar", label: "Kurslar", icon: BookOpen },
  { href: "/boshqaruv/analitika", label: "Analitika", icon: BarChart3 },
  { href: "/boshqaruv/talabalar", label: "Talabalar", icon: Users },
  { href: "/boshqaruv/sertifikat-sozlamalari", label: "Sertifikat", icon: Settings2 },
];

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block">
        <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">Boshqaruv paneli</p>
          <p className="text-xs text-slate-500">Eduhistory Admin/Ustoz</p>
        </div>
        <nav className="space-y-1">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="md:hidden">
        <details className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Admin menyu</span>
              <Badge variant="locked">Ochish</Badge>
            </div>
          </summary>
          <nav className="mt-3 grid gap-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>

      <main className="rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm">{children}</main>
    </div>
  );
}
