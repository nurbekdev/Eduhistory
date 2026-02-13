import Link from "next/link";
import Image from "next/image";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggle, LocaleSwitcher } from "@/components/layout/header-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { authOptions } from "@/lib/auth";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";

type MainHeaderProps = { locale: Locale };

export async function MainHeader({ locale }: MainHeaderProps) {
  const session = await getServerSession(authOptions);
  const t = getT(locale);
  const role = session?.user?.role;
  const isManagement = role === Role.ADMIN || role === Role.INSTRUCTOR;

  const publicLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/kurslar", label: t("nav.courses") },
  ];

  const roleLinks = isManagement
    ? [
        { href: "/boshqaruv", label: t("nav.management") },
        { href: "/boshqaruv/kurslar", label: t("nav.courses") },
        { href: "/boshqaruv/analitika", label: t("nav.analytics") },
      ]
    : session
      ? [
          { href: "/dashboard", label: t("nav.dashboard") },
          { href: "/mening-kurslarim", label: t("nav.myCourses") },
          { href: "/sertifikatlar", label: t("nav.certificates") },
        ]
      : [];

  function getRoleLabel(r: Role | undefined) {
    if (r === Role.ADMIN) return t("role.admin");
    if (r === Role.INSTRUCTOR) return t("role.instructor");
    return t("role.student");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <Image src="/eduhistory-logo.svg" alt="Eduhistory" width={36} height={36} className="h-9 w-9 shrink-0" />
          <span className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-400">Eduhistory</span>
        </Link>
        <nav className="hidden gap-2 md:flex">
          {[...publicLinks, ...roleLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user && <NotificationDropdown userRole={role ?? Role.STUDENT} />}
          <ThemeToggle />
          <LocaleSwitcher
            currentLocale={locale}
            labels={{ uz: "O'zbek", en: "EN" }}
          />
          {session?.user ? (
            <>
              <Badge variant="locked" className="hidden md:inline-flex">
                {getRoleLabel(role)}
              </Badge>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/profil" className="flex items-center gap-2">
                  <Avatar src={session.user.image ?? undefined} alt={session.user.name ?? session.user.email ?? "User"} size="sm" />
                  <span className="hidden sm:inline">{t("nav.profile")}</span>
                </Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kirish">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md">
                <Link href="/royxatdan-otish">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
