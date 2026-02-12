import Link from "next/link";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";

const publicLinks = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/kurslar", label: "Kurslar" },
];

function getRoleLabel(role: Role | undefined) {
  if (role === Role.ADMIN) return "Admin";
  if (role === Role.INSTRUCTOR) return "Ustoz";
  return "Talaba";
}

export async function MainHeader() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const isManagement = role === Role.ADMIN || role === Role.INSTRUCTOR;

  const roleLinks = isManagement
    ? [
        { href: "/boshqaruv", label: "Boshqaruv" },
        { href: "/boshqaruv/kurslar", label: "Kurslar" },
        { href: "/boshqaruv/analitika", label: "Analitika" },
      ]
    : session
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/mening-kurslarim", label: "Mening kurslarim" },
          { href: "/sertifikatlar", label: "Sertifikatlar" },
        ]
      : [];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-emerald-700">
          Eduhistory
        </Link>
        <nav className="hidden gap-2 md:flex">
          {[...publicLinks, ...roleLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Badge variant="locked" className="hidden md:inline-flex">
                {getRoleLabel(role)}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href="/profil">Mening profilim</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kirish">Kirish</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md">
                <Link href="/royxatdan-otish">Ro'yxatdan o'tish</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
