import Link from "next/link";
import Image from "next/image";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { Zap } from "lucide-react";

import { ThemeToggle, LocaleSwitcher } from "@/components/layout/header-actions";
import { MobileNavMenu } from "@/components/layout/mobile-nav-menu";
import { UserMenuDropdown } from "@/components/layout/user-menu-dropdown";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import { authOptions } from "@/lib/auth";
import { getT } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";

type MainHeaderProps = { locale: Locale };

export async function MainHeader({ locale }: MainHeaderProps) {
  const session = await getServerSession(authOptions);
  const t = getT(locale);
  const role = session?.user?.role;
  const isManagement = role === Role.ADMIN || role === Role.INSTRUCTOR;

  const coins =
    session?.user?.id != null
      ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { coins: true } }))?.coins ?? 0
      : 0;

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
        <MobileNavMenu links={[...publicLinks, ...roleLinks]} />
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {session?.user && <NotificationDropdown userRole={role ?? Role.STUDENT} />}
          {/* Til va tema faqat desktopda headerda; mobilda profil menyusida */}
          <div className="hidden items-center gap-1 md:flex">
            <ThemeToggle />
            <LocaleSwitcher
              currentLocale={locale}
              labels={{ uz: "O'zbek", en: "EN" }}
            />
          </div>
          {session?.user ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 dark:border-amber-800 dark:bg-amber-950/50">
                <Zap className="size-4 text-amber-500 dark:text-amber-400" />
                <span className="text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-200">{coins}</span>
              </div>
              <UserMenuDropdown
                imageUrl={session.user.image ?? null}
                role={role ?? Role.STUDENT}
                locale={locale}
                labels={{
                  profile: t("nav.profile"),
                  courses: t("nav.courses"),
                  myCourses: t("nav.myCourses"),
                  certificates: t("nav.certificates"),
                  management: t("nav.management"),
                  analytics: t("nav.analytics"),
                  language: t("nav.language"),
                  themeSettings: t("nav.themeSettings"),
                  light: t("theme.light"),
                  dark: t("theme.dark"),
                  langUz: t("lang.uz"),
                  langEn: t("lang.en"),
                  logout: t("auth.logout"),
                }}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 text-xs sm:px-3 sm:text-sm">
                <Link href="/kirish">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-500 px-2 text-xs text-white shadow-md sm:px-3 sm:text-sm">
                <Link href="/royxatdan-otish">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
